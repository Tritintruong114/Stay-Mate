import {
  BadRequestError,
  CreatedResponse,
  NotAuthorizedError,
  NotFoundError,
} from '@/helpers/utils';
import { KeyHeader } from '@/middleware/validate';
import { IReview } from '@/models/Review';
import {
  CreateReviewSchema,
  GetReviewsByUserSchema,
  GetReviewsSchema,
  UpdateReviewSchema,
} from '@/schema/review.schema';
import hotelsService from '@/services/hotels.service';
import reviewService from '@/services/review.service';
import { Pros, getDeleteFilter } from '@/utils/lodashUtil';
import { Response, Request } from 'express';
import { Types } from 'mongoose';

class ReviewController {
  /**
   * @check hotelDb check id có tìm dc Hotel
   * @check do review được tạo trước ở bullmq nên tìm kiếm review nếu k có đã quá hạn để review
   * @check check nếu chủ ks k được tạo reviews
   * @check nếu rely thi chu mới được tao
   */

  createReview = async (req: Request<any, any, CreateReviewSchema>, res: Response) => {
    const authorId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);
    const newReview = {
      context: req.body.context,
      images: req.body.images,
      starRating: req.body.starRating,
    };
    const parent_slug = req.body.parent_slug;
    const hotelId = new Types.ObjectId(req.body.hotelId);

    const hotelDb = await hotelsService.findOne({ _id: hotelId }, null, {
      lean: false,
    });

    const isOwnerHotel = hotelDb.userId.equals(authorId);

    if (!hotelDb) throw new NotFoundError('Not found hotel');

    const reviewDb = await reviewService.findById(req.params.id, null, { lean: false });

    if (!parent_slug) {
      if (reviewDb.starRating > 0) throw new NotAuthorizedError('Review has already ');

      if (!reviewDb) throw new NotAuthorizedError('User have already expired reviews');

      if (isOwnerHotel)
        throw new NotAuthorizedError('Hotelier cant not reviewDb their hotel');
    }

    Object.keys(newReview).forEach((key) => {
      reviewDb[key] = newReview[key];
    });

    if (parent_slug) {
      const replyReview: Pros<IReview> = getDeleteFilter(
        ['_id', 'createdAt', 'updatedAt', 'images'],
        reviewDb,
      );
      //check nếu chủ ks k được  tạo reply
      if (!isOwnerHotel) throw new NotAuthorizedError(' Only hotelier can reply review ');

      if (parent_slug !== reviewDb.slug) throw new BadRequestError('Wrong parent slug');

      //mỗi người chỉ tạo 1 reply
      if (reviewDb.isReply) throw new BadRequestError('Review has already reply');

      replyReview.parent_slug = parent_slug;

      replyReview.slug = `${reviewDb.slug}/${new Date().getTime().toString()}`;

      const createReview = await reviewService.createOne(replyReview);

      reviewDb.isReply = true;

      await reviewDb.save();

      return new CreatedResponse({
        message: ' Create reply successfully',
        data: createReview,
      }).send(res);
    }

    await reviewDb.save();

    hotelDb.starRating = {
      countReview: hotelDb.starRating.countReview + 1,
      starAverage:
        (hotelDb.starRating.starAverage * hotelDb.starRating.countReview +
          newReview.starRating) /
        (1 + hotelDb.starRating.countReview),
    };

    await hotelDb.save();

    new CreatedResponse({
      message: 'Create review successfully',
      data: reviewDb,
    }).send(res);
  };

  updateReview = async (req: Request<any, any, UpdateReviewSchema>, res: Response) => {
    /**
     * @check 'author.authorId' thì mới được sửa
     * @check có review
     */
    const { context, images, starRating, isDelete } = req.body;

    if (isDelete) {
      const newUpdate = await reviewService.findOneUpdate(
        {
          _id: new Types.ObjectId(req.params.id),
          'author.authorId': new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string),
        },
        { $set: { isDelete: true } },
      );
      return oke(newUpdate);
    }

    const newUpdate = await reviewService.findOneUpdate(
      {
        _id: new Types.ObjectId(req.params.id),
        'author.authorId': new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string),
      },
      { $set: { context, images, starRating, isDelete } },
    );

    return oke(newUpdate);
    function oke(newUpdate) {
      if (!newUpdate) throw new NotFoundError('Not found review');
      new CreatedResponse({ message: ' Update Review successfully' }).send(res);
    }
  };

  getReviewsByUser = async (
    req: Request<any, any, any, GetReviewsByUserSchema>,
    res: Response,
  ) => {
    /**
     * @case_1 nếu k hotelId parent_slug thì lấy reviews theo 2 điều kiện đã review hoặc chưa review
     * @case_2 hotelId parent_slug
     */
    const { hotelId, statusBooking, parent_slug, isReview } = req.query;

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);
    let reviews = [];

    if (Object.keys(req.query).every((key) => !req.query[key]))
      throw new BadRequestError('Request must have one value');

    if (statusBooking) {
      if (isReview) {
        reviews = await reviewService.findMany({
          query: {
            'author.authorId': userId,
            starRating: { $gte: 0.5 },
            parent_slug: '',
          },
          page: page,
          limit: limit,
        });
      }

      if (!isReview) {
        reviews = await reviewService.findMany({
          query: {
            'author.authorId': userId,
            parent_slug: '',
            starRating: 0,
          },
          page: page,
          limit: limit,
        });
      }
      return oke(reviews);
    }

    if (hotelId) {
      const hotelDb = await hotelsService.findById(hotelId);

      if (!hotelDb.userId.equals(userId))
        throw new NotAuthorizedError('Only hotelier can get hotel`s review');

      if (!parent_slug) {
        reviews = await reviewService.findMany({
          query: {
            'hotel.hotelId': hotelId,
            starRating: { $gte: 0.5 },
            parent_slug,
          },
          page: page,
          limit: limit,
        });
      }
      if (parent_slug) {
        reviews = await reviewService.findMany({
          query: {
            'hotel.hotelId': hotelId,
            parent_slug: { $ne: '' },
          },
          page: page,
          limit: limit,
        });
      }
      return oke(reviews);
    }

    function oke(reviews) {
      if (!reviews) throw new NotFoundError('Not found reviews');
      new CreatedResponse({
        message: ' get Data`review successfully',
        data: reviews,
      }).send(res);
    }
  };

  getReviews = async (req: Request<any, any, any, GetReviewsSchema>, res: Response) => {
    const { hotelId, parent_slug } = req.query;
    const page = req.query.page || 1;
    const limit = req.body.limit || 10;
    let reviews: [] | object;

    if (Object.keys(req.query).every((key) => !req.query[key]))
      throw new BadRequestError('Request must have one value');

    if (parent_slug) {
      const regex = new RegExp(parent_slug, 'i');

      reviews = await reviewService.findOne({ slug: regex });

      return oke(reviews);
    }

    if (!parent_slug) {
      reviews = await reviewService.findMany({
        query: {
          'hotel.hotelId': hotelId,
          starRating: { $gte: 0.5 },
        },
        page: page,
        limit: limit,
      });

      return oke(reviews);
    }

    function oke(reviews) {
      if (!reviews) throw new NotFoundError('Not found reviews');
      new CreatedResponse({
        message: ' Get Data`s review successfully',
        data: reviews,
      }).send(res);
    }
  };
}

const reviewController = new ReviewController();

export default reviewController;
