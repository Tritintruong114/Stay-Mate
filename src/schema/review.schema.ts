import { Status } from '@/models/Booking';
import regexUtil from '@/utils/regexUtil';
import * as Yup from 'yup';

export const createReviewSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'No input value'),
    context: Yup.string().min(1).max(500).required(),
    images: Yup.array(Yup.string().matches(regexUtil.URL_REGEX)).notRequired(),
    starRating: Yup.number().min(0.5).max(5).required(),
    parent_slug: Yup.string().notRequired(),
    hotelId: Yup.string().objectIdValid().required(),
  }),
});

export const updateReviewSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'No input value'),
    context: Yup.string().min(1).max(500).required(),
    images: Yup.array(Yup.string().matches(regexUtil.URL_REGEX)).notRequired(),
    starRating: Yup.number().min(0.5).max(5).required(),
    isDelete: Yup.boolean().notRequired(),
  }),
});

export const getReviewsByUserSchema = Yup.object().shape({
  query: Yup.object().shape({
    statusBooking: Yup.string().oneOf([Status.STAY]).notRequired(),
    isReview: Yup.boolean().notRequired(),
    parent_slug: Yup.boolean().notRequired(),
    page: Yup.number().integer().negative().min(1).notRequired(),
    limit: Yup.number().integer().negative().min(15).max(45).notRequired(),
    hotelId: Yup.string().objectIdValid().notRequired(),
  }),
});

export const getReviewsSchema = Yup.object().shape({
  query: Yup.object().shape({
    hotelId: Yup.string().objectIdValid().notRequired(),
    parent_slug: Yup.string().notRequired(),
    page: Yup.number().integer().negative().min(1).notRequired(),
    limit: Yup.number().integer().negative().min(15).max(45).notRequired(),
  }),
});

export type CreateReviewSchema = Yup.InferType<typeof createReviewSchema>['body'];

export type UpdateReviewSchema = Yup.InferType<typeof updateReviewSchema>['body'];

export type GetReviewsByUserSchema = Yup.InferType<
  typeof getReviewsByUserSchema
>['query'];

export type GetReviewsSchema = Yup.InferType<typeof getReviewsSchema>['query'];
