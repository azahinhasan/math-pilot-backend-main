export class UploadResponseDto {
  url: string;
  key: string;
}

export class MultipleUploadResponseDto {
  url: string;
  key: string;
  originalName: string;
}

export class UploadSuccessResponseDto {
  status: string;
  message: string;
  data: UploadResponseDto | MultipleUploadResponseDto[];
}

