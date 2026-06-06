import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateAgentReviewDto {
  @IsString()
  viewingId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MaxLength(2000)
  body: string;
}
