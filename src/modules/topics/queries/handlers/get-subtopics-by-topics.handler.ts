import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSubtopicsByTopicsQuery } from '../get-subtopics-by-topics.query';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@QueryHandler(GetSubtopicsByTopicsQuery)
export class GetSubtopicsByTopicsHandler implements IQueryHandler<GetSubtopicsByTopicsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetSubtopicsByTopicsQuery) {
    try {
      const { topicIds, clerkId } = query;

      if (!topicIds || topicIds.length === 0) {
        throw new BadRequestException('At least one topic ID is required');
      }

      // Fetch user authentication data and verify student has board and age level configured
      const authData = await this.prisma.auth.findUnique({
        where: {
          clerkId,
        },
        include: {
          student: {
            include: {
              boardAgeLevel: true,
            },
          },
        },
      });

      if (!authData?.student?.boardAgeLevel) {
        throw new BadRequestException(
          'No board and age level found for student',
        );
      }

      // Validate that the provided topic IDs exist and are not voided
      const topics = await this.prisma.topic.findMany({
        where: {
          id: {
            in: topicIds,
          },
          voided: false,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (topics.length === 0) {
        throw new BadRequestException('No valid topics found');
      }

      // Fetch all subtopics for the given topics with related data (topic info, module, practice questions)
      const subtopics = await this.prisma.subtopic.findMany({
        where: {
          topicId: {
            in: topicIds,
          },
          voided: false,
        },
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              paperNumber: true,
              serialNumber: true,
              module: {
                select: {
                  id: true,
                  name: true,
                  subject: true,
                },
              },
            },
          },
          questions: {
            where: {
              questionFor: 'Practice',
              voided: false,
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: [
          {
            topicId: 'asc',
          },
          {
            serialNumber: 'asc',
          },
        ],
      });

      // Group subtopics by their parent topic, organizing data hierarchically
      const groupedByTopic = subtopics.reduce((acc, subtopic) => {
        const topicId = subtopic.topic.id;
        // Initialize topic group if it doesn't exist
        if (!acc[topicId]) {
          acc[topicId] = {
            topicId: subtopic.topic.id,
            topicName: subtopic.topic.name,
            paperNumber: subtopic.topic.paperNumber,
            serialNumber: subtopic.topic.serialNumber,
            module: subtopic.topic.module,
            subtopics: [],
          };
        }
        // Add subtopic to its parent topic group
        acc[topicId].subtopics.push({
          id: subtopic.id,
          name: subtopic.name,
          logoFileName: subtopic.logoFileName,
          serialNumber: subtopic.serialNumber,
          content: subtopic.content,
          createdAt: subtopic.createdAt,
          updatedAt: subtopic.updatedAt,
        });
        return acc;
      }, {});

      return {
        message: 'Subtopics retrieved successfully',
        totalTopics: topics.length,
        totalSubtopics: subtopics.length,
        data: Object.values(groupedByTopic),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve subtopics');
    }
  }
}
