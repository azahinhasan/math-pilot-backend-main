import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserRecentActivityQuery } from '../get-user-recent-activity.query';
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1 min ago' : `${diffInMinutes} mins ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
}

@Injectable()
@QueryHandler(GetUserRecentActivityQuery)
export class GetUserRecentActivityHandler implements IQueryHandler<GetUserRecentActivityQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserRecentActivityQuery) {
    const { clerkId } = query;

    // Find the user by clerkId
    const authData = await this.prisma.auth.findUnique({
      where: {
        clerkId,
      },
      include: {
        student: true,
      },
    });

    if (!authData?.student) {
      throw new BadRequestException('Student not found');
    }

    const studentId = authData.student.id;

    const activities = await this.prisma.studentTopicDetails.findMany({
      where: {
        studentId,
      },
      include: {
        topic: {
          include: {
            module: true,
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 5,
    });

    const formattedActivities = activities.map((activity) => ({
      subjectName: activity.topic.module.subject,
      moduleName: activity.topic.module.name,
      topicName: activity.topic.name,
      status: activity.status,
      attemptDate: formatRelativeTime(activity.updatedAt || activity.createdAt),
    }));

    return {
      message: 'User recent activities retrieved successfully',
      data: formattedActivities,
    };
  }
}
