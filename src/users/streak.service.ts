import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Increment student's current streak and update longest streak if needed
   */
  async incrementStreak(studentId: string): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { currentStreak: true, longestStreak: true },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    const newCurrentStreak = student.currentStreak + 1;
    const newLongestStreak = Math.max(student.longestStreak, newCurrentStreak);

    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastActivity: new Date(),
      },
    });
  }

  /**
   * Check and reset streak if last activity was more than 2 days ago
   */
  async checkAndResetStreak(studentId: string): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { currentStreak: true, lastActivity: true },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    const now = new Date();
    const lastActivity = new Date(student.lastActivity);
    const daysSinceLastActivity = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Reset streak if more than 2 days have passed
    if (daysSinceLastActivity >= 2) {
      await this.prisma.student.update({
        where: { id: studentId },
        data: {
          currentStreak: 0,
        },
      });
    }
  }
}
