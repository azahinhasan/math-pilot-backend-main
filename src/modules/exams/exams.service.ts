import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { SubmitTestDto, QuestionTypeEnum } from './dto/submit-test.dto';
import { SubmissionStatus } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import FormData = require('form-data');
import { AxiosError } from 'axios';
import axios from 'axios';

interface SavedSubmissionData {
  submission: any;
  submissionData: any;
  questionType: QuestionTypeEnum;
  solutionBase: any;
}

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Submit test and start evaluation process
   */
  async submitTest(dto: SubmitTestDto, clerkId: string) {
    this.logger.log('=== TEST SUBMISSION START ===');
    this.logger.log(`Number of submissions: ${dto.submissions.length}`);

    const student = await this.prisma.student.findFirst({
      where: {
        auth: {
          clerkId: clerkId,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    try {
      // Validate student and exam
      await this.validateStudentAndExam(student.id, dto.examId);

      // Process all submissions
      const savedSubmissions = await this.processSubmissions(dto, student.id);

      this.logger.log('✅ All submissions saved with Submitted status');

      // Start background evaluation (non-blocking)
      this.startBackgroundEvaluation(savedSubmissions, student.id);

      return this.buildSubmissionResponse(savedSubmissions);
    } catch (error) {
      this.logger.error('❌ Test submission error:', error.message);
      throw error;
    }
  }

  /**
   * Validate that student and exam (if provided) exist
   */
  private async validateStudentAndExam(
    studentId: string,
    examId?: string,
  ): Promise<void> {
    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`);
    }

    // Verify exam exists if provided
    if (examId) {
      const exam = await this.prisma.exam.findUnique({
        where: { id: examId },
      });

      if (!exam) {
        throw new NotFoundException(`Exam with ID "${examId}" not found`);
      }
    }
  }

  /**
   * Process all submissions and save to database
   */
  private async processSubmissions(
    dto: SubmitTestDto,
    studentId: string,
  ): Promise<SavedSubmissionData[]> {
    const savedSubmissions: SavedSubmissionData[] = [];

    for (const submission of dto.submissions) {
      const savedData = await this.processSingleSubmission(dto, submission, studentId);
      savedSubmissions.push(savedData);
    }

    return savedSubmissions;
  }

  /**
   * Process a single submission
   */
  private async processSingleSubmission(
    dto: SubmitTestDto,
    submission: any,
    studentId: string,
  ): Promise<SavedSubmissionData> {
    // Fetch question with topic
    const question = await this.fetchQuestionWithTopic(submission.questionId);

    // Create main submission record
    const savedSubmission = await this.createSubmissionRecord(
      dto,
      submission,
      question,
      studentId,
    );

    // Get solution base
    const solutionBase = await this.fetchSolutionBase(submission.questionId);

    // Save submission data based on question type
    const submissionData = await this.saveSubmissionDataByType(
      submission,
      savedSubmission.id,
      solutionBase.id,
    );

    return {
      submission: savedSubmission,
      submissionData,
      questionType: submission.questionType,
      solutionBase,
    };
  }

  /**
   * Fetch question with topic information
   */
  private async fetchQuestionWithTopic(questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { topic: true },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID "${questionId}" not found`);
    }

    return question;
  }

  /**
   * Create main submission record
   */
  private async createSubmissionRecord(
    dto: SubmitTestDto,
    submission: any,
    question: any,
    studentId: string,
  ) {
    return this.prisma.submission.create({
      data: {
        studentId: studentId,
        questionId: submission.questionId,
        topicId: question.topicId,
        type: dto.examId ? 'Exam' : 'Practice',
        status: SubmissionStatus.Submitted,
        examId: dto.examId,
        beganAt: new Date(dto.beganAt),
        endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
      },
    });
  }

  /**
   * Fetch solution base with related data
   */
  private async fetchSolutionBase(questionId: string) {
    const solutionBase = await this.prisma.solutionBase.findUnique({
      where: { questionId },
      include: {
        solutionMCQs: true,
        solutionDescriptives: true,
      },
    });

    if (!solutionBase) {
      throw new NotFoundException(
        `Solution not found for question "${questionId}"`,
      );
    }

    return solutionBase;
  }

  /**
   * Save submission data based on question type
   */
  private async saveSubmissionDataByType(
    submission: any,
    submissionId: string,
    solutionId: string,
  ) {
    switch (submission.questionType) {
      case QuestionTypeEnum.MCQ:
      case QuestionTypeEnum.TrueFalse:
        return this.saveMcqSubmission(submission, submissionId, solutionId);

      case QuestionTypeEnum.Descriptive:
        return this.saveDescriptiveSubmission(
          submission,
          submissionId,
          solutionId,
        );

      default:
        throw new BadRequestException(
          `Unknown question type: ${submission.questionType}`,
        );
    }
  }

  /**
   * Save MCQ or True/False submission
   */
  private async saveMcqSubmission(
    submission: any,
    submissionId: string,
    solutionId: string,
  ) {
    return this.prisma.submittedMcq.create({
      data: {
        submissionId,
        solutionId,
        submittedOption: (submission.data as any).submittedOption,
        isCorrect: false, // Will be updated during evaluation
        awardedMark: null,
      },
    });
  }

  /**
   * Save Descriptive submission
   */
  private async saveDescriptiveSubmission(
    submission: any,
    submissionId: string,
    solutionId: string,
  ) {
    const descriptiveData = submission.data as any;

    return this.prisma.submittedDescriptive.create({
      data: {
        submissionId,
        solutionId,
        descriptiveSubmittedAnswer:
          descriptiveData.descriptiveSubmittedAnswer || null,
        solutionImageFileName: descriptiveData.solutionImageFileName || null,
        canvasData: descriptiveData.canvasData || {},
        hint: descriptiveData.hint || null,
        chatHistory: descriptiveData.chatHistory || null,
        isCorrect: false, // Will be updated during evaluation
        awardedMarks: null,
      },
    });
  }

  /**
   * Start background evaluation (non-blocking)
   */
  private startBackgroundEvaluation(
    savedSubmissions: SavedSubmissionData[],
    studentId: string,
  ): void {
    this.evaluateSubmissionsInBackground(savedSubmissions, studentId).catch(
      (error) => {
        this.logger.error('Background evaluation error:', error);
      },
    );
  }

  /**
   * Build successful submission response
   */
  private buildSubmissionResponse(savedSubmissions: SavedSubmissionData[]) {
    return {
      status: 'success',
      message: 'Test submitted successfully. Evaluation in progress.',
      data: {
        submissionIds: savedSubmissions.map((s) => s.submission.id),
        evaluationStatus: 'submitted',
      },
    };
  }

  /**
   * Background evaluation process
   */
  private async evaluateSubmissionsInBackground(
    savedSubmissions: SavedSubmissionData[],
    studentId: string,
  ) {
    this.logger.log('=== BACKGROUND EVALUATION START ===');

    for (const {
      submission,
      submissionData,
      questionType,
      solutionBase,
    } of savedSubmissions) {
      try {
        this.logger.log(
          `Evaluating submission ${submission.id} (${questionType})`,
        );

        switch (questionType) {
          case QuestionTypeEnum.MCQ:
          case QuestionTypeEnum.TrueFalse:
            await this.evaluateMCQOrTrueFalse(
              submission,
              submissionData,
              solutionBase,
            );
            break;

          case QuestionTypeEnum.Descriptive:
            await this.evaluateDescriptive(
              submission,
              submissionData,
              solutionBase,
            );
            break;
        }

        // Update submission status to Graded
        await this.prisma.submission.update({
          where: { id: submission.id },
          data: { status: SubmissionStatus.Graded },
        });

        this.logger.log(
          `✅ Submission ${submission.id} evaluated successfully`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Error evaluating submission ${submission.id}:`,
          error.message,
        );

        // Update submission status to Submitted (evaluation failed)
        await this.prisma.submission.update({
          where: { id: submission.id },
          data: { status: SubmissionStatus.Submitted },
        });
      }
    }

    this.logger.log('=== BACKGROUND EVALUATION END ===');
  }

  /**
   * Evaluate MCQ or True/False question
   */
  private async evaluateMCQOrTrueFalse(
    submission: any,
    submittedMcq: any,
    solutionBase: any,
  ) {
    this.logger.log(`Evaluating MCQ/TrueFalse for submission ${submission.id}`);

    // Find the correct option
    const correctOption = solutionBase.solutionMCQs.find(
      (mcq: any) => mcq.isCorrect,
    );

    if (!correctOption) {
      throw new Error('No correct option found in solution');
    }

    // Compare submitted option with correct option
    const isCorrect =
      submittedMcq.submittedOption.trim().toLowerCase() ===
      correctOption.optionText.trim().toLowerCase();

    // Calculate marks
    const awardedMark = isCorrect ? correctOption.mark || 1 : 0;

    // Update submitted MCQ
    await this.prisma.submittedMcq.update({
      where: { id: submittedMcq.id },
      data: {
        isCorrect,
        awardedMark,
      },
    });

    // Update submission with awarded marks
    await this.prisma.submission.update({
      where: { id: submission.id },
      data: {
        awardedMarks: awardedMark,
        correctAnswersCount: isCorrect ? 1 : 0,
      },
    });

    this.logger.log(
      `MCQ/TrueFalse evaluated: ${isCorrect ? 'Correct' : 'Incorrect'}, Marks: ${awardedMark}`,
    );
  }

  /**
   * Evaluate Descriptive question using external AI API
   */
  private async evaluateDescriptive(
    submission: any,
    submittedDescriptive: any,
    solutionBase: any,
  ) {
    this.logger.log(`Evaluating Descriptive for submission ${submission.id}`);

    try {
      const solutionDescriptive = solutionBase.solutionDescriptives[0];
      if (!solutionDescriptive) {
        throw new Error('No descriptive solution found');
      }

      const question = await this.prisma.question.findUnique({
        where: { id: submission.questionId },
      });

      if (!question) {
        throw new Error('Question not found');
      }

      // Check if solution image exists
      if (!submittedDescriptive.solutionImageFileName) {
        await this.handleMissingSolutionImage(
          submission.id,
          submittedDescriptive.id,
        );
        return;
      }

      // Download image and call Math API
      const evaluateMathApiUrl = this.getEvaluationApiUrl();
      const imageBuffer = await this.downloadSolutionImage(
        submittedDescriptive.solutionImageFileName,
      );
      const apiResult = await this.callMathEvaluationAPI(
        evaluateMathApiUrl,
        imageBuffer,
        question,
        solutionDescriptive,
        submittedDescriptive,
      );

      // Calculate marks based on AI verdict
      const { isCorrect, awardedMarks } = this.calculateMarks(
        apiResult,
        solutionDescriptive,
        question,
      );

      // Save evaluation results
      await this.saveDescriptiveEvaluationResults(
        submission.id,
        submittedDescriptive.id,
        apiResult,
        isCorrect,
        awardedMarks,
        submittedDescriptive,
      );

      this.logger.log(
        `Descriptive evaluated: ${apiResult.verdict}, Marks: ${awardedMarks}`,
      );
    } catch (error) {
      await this.handleDescriptiveEvaluationError(
        error,
        submission.id,
        submittedDescriptive.id,
      );
      throw error;
    }
  }

  /**
   * Handle missing solution image
   */
  private async handleMissingSolutionImage(
    submissionId: string,
    submittedDescriptiveId: string,
  ) {
    this.logger.warn('No solution image URL provided for descriptive question');

    await this.prisma.submittedDescriptive.update({
      where: { id: submittedDescriptiveId },
      data: {
        isCorrect: false,
        awardedMarks: 0,
        verdict: 'No solution provided',
      },
    });

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        awardedMarks: 0,
        correctAnswersCount: 0,
      },
    });
  }

  /**
   * Get evaluation API URL from config
   */
  private getEvaluationApiUrl(): string {
    const apiUrl = this.configService.get<string>('EVALUATE_MATH_API_URL');

    if (!apiUrl) {
      throw new InternalServerErrorException('Math API URL not configured');
    }

    this.logger.log(`Calling Math API at: ${apiUrl}`);
    return apiUrl;
  }

  /**
   * Download solution image from URL (S3 or regular URL)
   */
  private async downloadSolutionImage(imageFileName: string): Promise<Buffer> {
    this.logger.log(`Downloading image from URL: ${imageFileName}`);

    // Check if it's an S3 URL
    if (
      imageFileName.includes('.s3.') ||
      imageFileName.includes('s3.amazonaws.com')
    ) {
      return this.downloadFromS3(imageFileName);
    } else {
      return this.downloadFromUrl(imageFileName);
    }
  }

  /**
   * Download image from S3 using AWS SDK
   */
  private async downloadFromS3(imageFileName: string): Promise<Buffer> {
    const url = new URL(imageFileName);
    const key = url.pathname.substring(1);

    this.logger.log(`Detected S3 URL, extracting key: ${key}`);

    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');

    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');

    if (!region || !accessKeyId || !secretAccessKey || !bucket) {
      throw new InternalServerErrorException('AWS credentials not configured');
    }

    const s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const s3Response = await s3Client.send(command);

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of s3Response.Body as any) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    this.logger.log(`✅ Image downloaded from S3: ${buffer.length} bytes`);
    return buffer;
  }

  /**
   * Download image from regular URL
   */
  private async downloadFromUrl(imageFileName: string): Promise<Buffer> {
    const imageResponse = await axios.get(imageFileName, {
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(imageResponse.data);
    this.logger.log(`✅ Image downloaded: ${buffer.length} bytes`);
    return buffer;
  }

  /**
   * Call Math evaluation API
   */
  private async callMathEvaluationAPI(
    apiUrl: string,
    imageBuffer: Buffer,
    question: any,
    solutionDescriptive: any,
    submittedDescriptive: any,
  ) {
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
    });

    formData.append('question', question.questionText);
    formData.append('currentStepCount', question.stepCount.toString());
    formData.append(
      'correct_answer',
      solutionDescriptive.descriptiveSolution || '',
    );

    if (submittedDescriptive.chatHistory) {
      formData.append('chat_history', submittedDescriptive.chatHistory);
    }

    this.logger.log('Sending request to Math API...');

    const response = await axios.post(apiUrl, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 240000, // 4 minutes
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    this.logger.log('Math API Response received');

    if (response.status !== 200) {
      throw new Error(`Math API returned status ${response.status}`);
    }

    return response.data;
  }

  /**
   * Calculate marks based on AI verdict
   */
  private calculateMarks(
    apiResult: any,
    solutionDescriptive: any,
    question: any,
  ) {
    let awardedMarks = 0;
    let isCorrect = false;

    if (apiResult.verdict === 'correct' || apiResult.is_finished === true) {
      isCorrect = true;
      awardedMarks = solutionDescriptive.maxMarks || question.totalMarks || 0;
    } else if (apiResult.verdict === 'on track') {
      awardedMarks = Math.floor(
        (solutionDescriptive.maxMarks || question.totalMarks || 0) * 0.5,
      );
    }

    return { isCorrect, awardedMarks };
  }

  /**
   * Save descriptive evaluation results to database
   */
  private async saveDescriptiveEvaluationResults(
    submissionId: string,
    submittedDescriptiveId: string,
    apiResult: any,
    isCorrect: boolean,
    awardedMarks: number,
    submittedDescriptive: any,
  ) {
    // Update submitted descriptive with all LLM response fields
    await this.prisma.submittedDescriptive.update({
      where: { id: submittedDescriptiveId },
      data: {
        isCorrect,
        awardedMarks,
        verdict: apiResult.verdict,
        hint: apiResult.hint || submittedDescriptive.hint,
        chatHistory: apiResult.chat_history || submittedDescriptive.chatHistory,
        evaluation: apiResult.evaluation || null,
        ocrOutput: apiResult.extracted_text || null,
        isFinished: apiResult.is_finished || null,
        nextStepCount: apiResult.nextStepCount || null,
      },
    });

    // Update submission with awarded marks
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        awardedMarks,
        correctAnswersCount: isCorrect ? 1 : 0,
      },
    });
  }

  /**
   * Handle descriptive evaluation error
   */
  private async handleDescriptiveEvaluationError(
    error: any,
    submissionId: string,
    submittedDescriptiveId: string,
  ) {
    this.logger.error('Descriptive evaluation error:', error.message);

    if (error instanceof AxiosError) {
      this.logger.error('API Error details:', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    // Mark as evaluation failed
    await this.prisma.submittedDescriptive.update({
      where: { id: submittedDescriptiveId },
      data: {
        isCorrect: false,
        awardedMarks: 0,
        verdict: 'Evaluation failed',
      },
    });

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        awardedMarks: 0,
        correctAnswersCount: 0,
      },
    });
  }

  /**
   * Get user's exam statuses based on submissions
   * Returns exam status (graded/submitted) for each exam the user has attempted
   */
  async getUserExamStatuses(studentId: string) {
    this.logger.log(`Fetching exam statuses for student: ${studentId}`);

    // Get all submissions grouped by examId with status aggregation and exam details
    // All done in a single query with JOIN - no loops needed!
    const examStatuses = await this.prisma.$queryRaw<
      Array<{
        exam_id: string;
        exam_name: string;
        exam_type: string;
        start_time: Date;
        end_time: Date;
        total_marks: number;
        total_submissions: bigint;
        graded_count: bigint;
        submitted_count: bigint;
        in_progress_count: bigint;
      }>
    >`
      SELECT 
        s."exam_id",
        e."name" as exam_name,
        e."type" as exam_type,
        e."start_time",
        e."end_time",
        e."total_marks",
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE s.status = 'Graded') as graded_count,
        COUNT(*) FILTER (WHERE s.status = 'Submitted') as submitted_count,
        COUNT(*) FILTER (WHERE s.status = 'InProgress') as in_progress_count
      FROM "Submission" s
      INNER JOIN "Exam" e ON s."exam_id" = e."id"
      WHERE s."student_id" = ${studentId}
        AND s."exam_id" IS NOT NULL
        AND s."voided" = false
      GROUP BY s."exam_id", e."name", e."type", e."start_time", e."end_time", e."total_marks"
      ORDER BY e."start_time" DESC
    `;

    // Process the results - just transform the data, no additional queries
    const results = examStatuses.map((examStat) => {
      const totalSubmissions = Number(examStat.total_submissions);
      const gradedCount = Number(examStat.graded_count);
      const submittedCount = Number(examStat.submitted_count);
      const inProgressCount = Number(examStat.in_progress_count);

      // Determine exam status: graded if all submissions are graded, otherwise submitted
      const examStatus: 'graded' | 'submitted' =
        gradedCount === totalSubmissions ? 'graded' : 'submitted';

      return {
        examId: examStat.exam_id,
        examName: examStat.exam_name,
        examType: examStat.exam_type,
        examStatus,
        totalSubmissions,
        gradedCount,
        submittedCount,
        inProgressCount,
        startTime: examStat.start_time,
        endTime: examStat.end_time,
        totalMarks: examStat.total_marks,
      };
    });

    this.logger.log(`Found ${results.length} exams for student ${studentId}`);

    return {
      status: 'success',
      data: {
        studentId,
        exams: results,
        totalExams: results.length,
      },
    };
  }
}
