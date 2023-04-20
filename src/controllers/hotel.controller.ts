import {
  CreatedResponse,
  DuplicateError,
  NoDataResponse,
  NotFoundError,
  ServiceUnavailableError,
  SuccessResponse,
} from '@/helpers/utils';
import { KeyHeader } from '@/middleware/validate';
import { HotelDocument, Package, IHotel } from '@/models/Hotel';
import { Role } from '@/models/User';
import {
  CreateHotelSchema,
  CreateRoomSchema,
  GetHotelSchema,
  UpdateHotelSchema,
  UpdateRoomSchema,
} from '@/schema/hotel.schema';
import HotelService from '@/services/hotels.service';
import SecretKeyStoreService from '@/services/keyStore.service';
import MembershipService from '@/services/membership.service';
import RoomTypeService from '@/services/roomType.service';
import UserService from '@/services/user.service';
import {
  Pros,
  getConvertCreatedAt,
  getDeleteFilter,
  getFilterData,
} from '@/utils/lodashUtil';
import redisUtil from '@/utils/redisUtil';
import tokenUtil from '@/utils/tokenUtil';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { FilterQuery, Types } from 'mongoose';

class HotelController {
  createHotel = async (req: Request<any, any, CreateHotelSchema>, res: Response) => {
    /**
     * @check duplicateRDuplicateError Hotel
     * @create Hotel , room types db
     * @package membership week
     * @create  create membership DB
     * @redis {key:membershipId : value 'membership' } expires 1 week redis key memberShipId : 'memberShipId'
     * @create if user create a first hotel accessToken, refreshToken  with role Hollers update secretKeyStore
     * @send data
     */
    const { role, email } = req.user;

    const newHotel: Pros<IHotel> = getDeleteFilter(['roomTypes'], req.body);

    newHotel.userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);
    const roomTypes = req.body.roomTypes;

    const hotelsDb = await HotelService.findMany({
      query: { userId: newHotel.userId },
      page: 1,
      limit: 100,
    });

    hotelsDb.forEach((hotelDb) => {
      if (hotelDb.hotelName === newHotel.hotelName)
        throw new DuplicateError('DuplicateError newHotel name');
    });

    const createRoomsSuccess = await RoomTypeService.createMany(roomTypes);

    if (!createRoomsSuccess)
      throw new ServiceUnavailableError('Cant not create Hotel, try again ');

    newHotel.roomTypeIds = createRoomsSuccess.map((room) => room._id);

    const createHotelSuccess = await HotelService.createOne(newHotel);

    if (!createHotelSuccess)
      throw new ServiceUnavailableError('Cant not create Hotel, try again ');

    const week = new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 7);

    const createMembership = await MembershipService.createOne({
      userId: newHotel.userId,
      timeEnd: week,
      package: Package.WEEK,
      isExpire: false,
    });

    const valueRedis = { MembershipId: createMembership._id };

    await redisUtil.set(
      createHotelSuccess._id.toHexString(),
      JSON.stringify(valueRedis),
      {
        EX: week.getTime(),
      },
    );

    if (role === Role.USER) {
      const secretKey = crypto.randomBytes(32).toString('hex');
      const { accessToken, refreshToken } = tokenUtil.createTokenPair(
        { role: Role.HOTELIER, email },
        secretKey,
      );

      await SecretKeyStoreService.findOneUpdate(
        { userId: newHotel.userId, deviceId: req.ip },
        {
          refreshToken,
          secretKey,
        },
      );

      await UserService.findOneUpdate(
        { _id: newHotel.userId },
        { $set: { role: Role.HOTELIER } },
      );
      res
        .cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: false,
          path: '/',
          sameSite: 'strict',
        })
        .cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: false,
          path: '/',
          sameSite: 'strict',
        });

      return oke();
    }

    oke();
    function oke() {
      new CreatedResponse({
        message: 'Create hotel successfully',
        data: getFilterData(
          ['hotelName', 'image', 'address', 'package', 'city', 'country'],
          newHotel,
        ),
      }).send(res);
    }
  };

  updateHotel = async (req: Request<any, any, UpdateHotelSchema>, res: Response) => {
    const userId = req.headers[KeyHeader.USER_ID];

    if (req.body.isDelete) {
      const result = await HotelService.findOneUpdate(
        {
          userId,
          _id: new Types.ObjectId(req.params.id),
        },
        { $set: { isdDelete: true } },
        { new: true },
      );
      return new NoDataResponse({
        message: 'delete hotel successfully',
        data: result,
      }).send(res);
    }

    const result = await HotelService.findOneUpdate(
      {
        userId,
        _id: new Types.ObjectId(req.params.id),
      },
      { $set: { ...req.body } },
      { new: true },
    );

    if (!result) throw new NotFoundError('Not found hotel');

    new SuccessResponse({
      message: 'Update hotel successfully',
      data: result,
    }).send(res);
  };

  createRoom = async (req: Request<any, any, CreateRoomSchema>, res: Response) => {
    const newRooms = await RoomTypeService.createMany(req.body.roomTypes);

    const userId = req.headers[KeyHeader.USER_ID];
    const roomIds = newRooms.map((pros) => pros._id);
    const hotelId = req.params.id;

    if (req.body.isUpdateMulti) {
      // create rồi nên lun oke ?? k cần kiểm tra
      // kt validate userId roi nen k can kiem tra role hotels chac chan co hotels roi
      await HotelService.findOneUpdate(
        { userId },
        { $addToSet: { roomTypeIds: roomIds } },
      );
      return oke();
    }

    // id co the client sai
    const updateHotel = await HotelService.findByIdUpdate(hotelId, {
      $addToSet: { roomTypeIds: roomIds },
    });

    if (!updateHotel) {
      await RoomTypeService.deleteRoomType({
        _id: { $in: newRooms.map((room) => room._id) },
      });

      throw new NotFoundError('Not found hotel');
    } else {
      return oke();
    }

    function oke() {
      return new CreatedResponse({
        message: 'Add room type successfully',
        data: newRooms,
      }).send(res);
    }
  };

  updateRoomType = async (req: Request<any, any, UpdateRoomSchema>, res: Response) => {
    const roomId = req.params.id;

    const updatePrimitive = getDeleteFilter(['roomAmenities', 'images'], req.body);

    const images = req.body.images;
    const roomAmenities = req.body.roomAmenities;

    const newUpdate = await RoomTypeService.findByIdUpdate(
      roomId,
      {
        $set: updatePrimitive,
        $addToSet: {
          images,
          roomAmenities,
        },
      },
      { new: true },
    );

    if (!newUpdate) throw new NotFoundError('Not found room');

    new SuccessResponse({
      message: 'Update room type successfully',
      data: newUpdate,
    }).send(res);
  };

  getHotels = async (req: Request<any, any, any, GetHotelSchema>, res: Response) => {
    let query: FilterQuery<HotelDocument> = getDeleteFilter(['page,limit'], req.query);
    const page = req.query.page | 1;
    const limit = req.query.limit | 15;

    query = getConvertCreatedAt(query, ['city', 'hotelName', 'country']);

    query.isDelete = false;
    query.package = { $ne: Package.FREE };

    const hotels = await HotelService.findMany({ query, page, limit });

    if (!hotels.length) throw new NotFoundError('Not found hotel');

    new SuccessResponse({
      message: 'get hotel`s data successfully',
      data: hotels,
    }).send(res);
  };

  detailHotel = async (req: Request, res: Response) => {
    const hotelId = req.params.id;

    const hotel = await HotelService.findOneAndPopulateById(hotelId);

    if (!hotel) throw new NotFoundError('Not found hotel');

    new SuccessResponse({
      message: 'Get detail hotel successfully',
      data: hotel,
    }).send(res);
  };
}

const hotelController = new HotelController();

export default hotelController;
