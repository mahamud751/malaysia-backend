import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateAgentReviewDto } from './dto/create-agent-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('by-viewing/:viewingId')
  @ApiOperation({ summary: 'Get review for a viewing (if any)' })
  findByViewing(
    @Param('viewingId') viewingId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.reviewsService.findByViewing(viewingId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a review for a completed viewing' })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAgentReviewDto,
  ) {
    return this.reviewsService.create(user.id, dto);
  }
}
