import Review, { IReview, ReviewDocument } from '@/models/Review';
import BaseService, { QueryWithPagination } from './base.service';
import { QueryOptions } from 'mongoose';

class ReviewService extends BaseService<IReview, ReviewDocument> {
  constructor() {
    super(Review);
  }

  override findMany = async (
    query: QueryWithPagination<ReviewDocument>,
    option?: QueryOptions,
  ) => {
    return await this.Model.find(query.query, null, {
      lean: true,
      ...option,
    })
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .sort('-createdAt')
      .exec();
  };
}

const reviewService = new ReviewService();

export default reviewService;
