import { IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class GetSubtopicsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one topic ID is required' })
  @IsNotEmpty({ each: true })
  topicIds: string[];
}
