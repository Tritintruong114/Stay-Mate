import { PropertyType } from '@/models/Hotel';
import { RoomAmenities } from '@/models/Room-type';
import regexUtil from '@/utils/regexUtil';
import * as Yup from 'yup';

export const createHotelSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'No have _id'),
    hotelName: Yup.string().required(),
    address: Yup.string().required(),
    city: Yup.string().required(),
    country: Yup.string().required(),
    zipCode: Yup.number().integer().min(999).required(),
    propertyType: Yup.string().oneOf(Object.values(PropertyType)).required(),
    star: Yup.number().min(0.5).max(5).required(),
    package: Yup.string().max(0, 'No have package'),
    images: Yup.string().matches(regexUtil.URL_REGEX, 'Must be url').notRequired(),
    roomTypes: Yup.array(
      Yup.object().shape({
        _id: Yup.string().max(0, 'No update _id'),
        roomAmenities: Yup.array(
          Yup.string().oneOf(Object.values(RoomAmenities)),
        ).required(),
        nameOfRoom: Yup.string().required(),
        rateDescription: Yup.string().required(),
        price: Yup.number().min(1).required(),
        mealType: Yup.string().notRequired(),
        taxType: Yup.string().notRequired(),
        images: Yup.array(
          Yup.string().matches(regexUtil.URL_REGEX, 'Must be url'),
        ).required(),
        numberOfRoom: Yup.number().min(1).integer().required(),
      }),
    ).required('RoomTypes have 1'),
  }),
});

export const updateHotelSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'No update _id'),
    package: Yup.string().max(0, 'No have package'),
    hotelName: Yup.string().notRequired(),
    address: Yup.string().notRequired(),
    city: Yup.string().notRequired(),
    country: Yup.string().notRequired(),
    zipCode: Yup.number().integer().min(999).notRequired(),
    propertyType: Yup.string().oneOf(Object.values(PropertyType)).notRequired(),
    star: Yup.number().min(0.5).max(5).notRequired(),
    images: Yup.string().matches(regexUtil.URL_REGEX, 'Must be url').notRequired(),
    isDelete: Yup.boolean().notRequired(),
  }),
});

export const createRoomSchema = Yup.object().shape({
  body: Yup.object().shape({
    isCreateMulti: Yup.boolean().notRequired(),
    roomTypes: Yup.array(
      Yup.object().shape({
        _id: Yup.string().max(0, 'No update _id'),
        roomAmenities: Yup.array(
          Yup.string().oneOf(Object.values(RoomAmenities)),
        ).required(),
        nameOfRoom: Yup.string().required(),
        rateDescription: Yup.string().required(),
        price: Yup.number().min(1).required(),
        mealType: Yup.string().notRequired(),
        taxType: Yup.string().notRequired(),
        images: Yup.array(Yup.string().matches(regexUtil.URL_REGEX, 'Must be url'))
          .min(1)
          .required(),
        numberOfRoom: Yup.number().min(1).integer().required(),
      }),
    )
      .min(1)
      .required(),
  }),
});

export const updateRoomSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'No update _id'),
    roomAmenities: Yup.array(
      Yup.string().oneOf(Object.values(RoomAmenities)),
    ).notRequired(),
    nameOfRoom: Yup.string().notRequired(),
    rateDescription: Yup.string().notRequired(),
    price: Yup.number().min(1).notRequired(),
    mealType: Yup.string().notRequired(),
    taxType: Yup.string().notRequired(),
    images: Yup.array(
      Yup.string().matches(regexUtil.URL_REGEX, 'Must be url'),
    ).notRequired(),
    numberOfRoom: Yup.number().min(1).integer().notRequired(),
  }),
});

export const getHotelSchema = Yup.object().shape({
  query: Yup.object().shape({
    hotelName: Yup.string().notRequired(),
    address: Yup.string().notRequired(),
    city: Yup.string().notRequired(),
    country: Yup.string().when('city', (city, field) =>
      city.length ? field.notRequired() : field.required(),
    ),
    zipCode: Yup.number().integer().min(999).notRequired(),
    propertyType: Yup.string().oneOf(Object.values(PropertyType)).notRequired(),
    star: Yup.number().min(0.5).max(5).notRequired(),
    createdAt_gte: Yup.date().max(new Date()).notRequired(),
    createdAt_lte: Yup.date().min('2023-04-06').notRequired(),
    createdAt: Yup.date().when(['createdAt_gte', 'createdAt_lte'], {
      is: (createdAt_gte, createdAt_lte) => createdAt_gte || createdAt_lte,
      then: (field) =>
        field.max(
          0,
          'Cant input the value because you had value createdAt_gte or createdAt_lte ',
        ),
      otherwise: (field) => field.notRequired(),
    }),
    page: Yup.number().integer().negative().min(1).notRequired(),
    limit: Yup.number().integer().negative().min(15).max(45).notRequired(),
  }),
});

export type CreateHotelSchema = Yup.InferType<typeof createHotelSchema>['body'];
export type UpdateHotelSchema = Yup.InferType<typeof updateHotelSchema>['body'];
export type CreateRoomSchema = Yup.InferType<typeof createRoomSchema>['body'];
export type UpdateRoomSchema = Yup.InferType<typeof updateRoomSchema>['body'];
export type GetHotelSchema = Yup.InferType<typeof getHotelSchema>['query'];
