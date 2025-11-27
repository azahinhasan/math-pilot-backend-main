# Ilmino - Updated Technical Architecture Plan

## Executive Summary

This document presents an updated technical architecture plan based on the detailed requirements from the Maths AI Core Requirement & Workflow Document. The architecture now incorporates CQRS (Command Query Responsibility Segregation) with MongoDB for high-performance analytics and real-time WebSocket data transmission.

## Updated System Overview

### Core Domain Changes

Based on the new requirements, the system has evolved to focus on:
- **Mathematics education** as the primary subject
- **Classroom-based learning** with teacher-student relationships
- **Real-time analytics** for teachers, parents, and institutions
- **AI-powered assessment** and practice features

### User Types and Relationships

1. **Institution**: Registers teachers, manages institutional analytics
2. **Teacher**: Creates classes, manages students, creates exams/homework
3. **Student (Teacher-registered)**: Accesses classroom features
4. **Student (Independent)**: Self-directed learning
5. **Parent**: Registers students, views analytics

## Updated Data Architecture

### CQRS Implementation Strategy

#### Command Side (PostgreSQL with Prisma)
- **Write Operations**: User management, class creation, exam creation, submissions
- **Transactional Data**: Ensures ACID compliance for critical operations
- **Core Entities**: Users, Classes, Exams, Homework, Submissions, Questions

#### Query Side (MongoDB)
- **Read Operations**: Real-time analytics, dashboards, progress tracking
- **Aggregated Views**: Pre-calculated metrics for fast retrieval
- **WebSocket Data**: Live updates for teachers, parents, institutions

### Updated Entity Relationship Diagram

#### Core Entities

```
[Institution] 1 ──< [Teacher] 1 ──< [Class] 1 ──< [Student]
     │                    │                    │
     │                    │                    └─< [Exam]
     │                    │                    └─< [Homework]
     │                    │                    └─< [Submission]
     │                    │
     │                    └─< [QuestionBank]
     │                    └─< [Analytics]
     │
     └─< [InstitutionAnalytics]
```

#### Detailed Entity Structure

**Institution**
- id, name, contact_info, created_at, updated_at
- relationships: has_many teachers, has_many classes (through teachers)

**Teacher**
- id, email, name, employee_id, institution_id, subject, created_at
- relationships: belongs_to institution, has_many classes

**Class**
- id, name, teacher_id, age_group, board, subject, start_date, end_date, status
- relationships: belongs_to teacher, has_many students, has_many exams, has_many homework

**Student**
- id, email, name, registered_by_type, registered_by_id, age_group, board, created_at
- relationships: has_many classes (through class_enrollments), has_many submissions

**Exam**
- id, class_id, name, topic, start_time, end_time, duration, status, created_by
- relationships: belongs_to class, has_many questions, has_many submissions

**Homework**
- id, class_id, name, topic, due_date, status, created_by
- relationships: belongs_to class, has_many questions, has_many submissions

**Submission**
- id, student_id, exam_id/homework_id, answers, ai_feedback, teacher_marks, final_marks, submitted_at
- relationships: belongs_to student, belongs_to exam/homework

**Question**
- id, content, answer, explanation, topic, difficulty_level, board, age_group, created_by
- relationships: has_many exam_questions, has_many homework_questions

## MongoDB Collections for Analytics

### Real-time Analytics Collections

#### 1. StudentProgress
```json
{
  "_id": ObjectId(),
  "student_id": "uuid",
  "class_id": "uuid",
  "exam_stats": {
    "total_exams": 10,
    "completed_exams": 8,
    "average_score": 85.5,
    "last_activity": ISODate()
  },
  "topic_mastery": {
    "algebra": { "score": 90, "attempts": 5 },
    "geometry": { "score": 78, "attempts": 3 }
  },
  "real_time_metrics": {
    "current_streak": 3,
    "improvement_rate": 0.15,
    "last_updated": ISODate()
  }
}
```

#### 2. ClassAnalytics
```json
{
  "_id": ObjectId(),
  "class_id": "uuid",
  "teacher_id": "uuid",
  "daily_stats": {
    "active_students": 25,
    "completed_assignments": 18,
    "average_class_score": 82.3
  },
  "topic_performance": {
    "algebra": { "class_average": 85, "participation": 0.92 },
    "geometry": { "class_average": 78, "participation": 0.88 }
  },
  "last_updated": ISODate()
}
```

#### 3. InstitutionAnalytics
```json
{
  "_id": ObjectId(),
  "institution_id": "uuid",
  "summary": {
    "total_classes": 50,
    "active_classes": 45,
    "total_students": 1200,
    "total_teachers": 25,
    "overall_performance": 81.5
  },
  "teacher_performance": [
    { "teacher_id": "uuid", "class_count": 3, "student_count": 75, "average_score": 83.2 }
  ],
  "last_updated": ISODate()
}
```

#### 4. ParentAnalytics
```json
{
  "_id": ObjectId(),
  "parent_id": "uuid",
  "children": [
    {
      "student_id": "uuid",
      "name": "John Doe",
      "recent_scores": [85, 92, 78],
      "improvement_trend": "upward",
      "last_activity": ISODate()
    }
  ]
}
```

## CQRS Implementation Details

### Command Model (PostgreSQL)

#### Write Operations
- User registration and authentication
- Class creation and management
- Exam/homework creation
- Student submissions
- Teacher grading and feedback

#### Schema Design
```sql
-- Core tables remain in PostgreSQL
CREATE TABLE institutions (...);
CREATE TABLE teachers (...);
CREATE TABLE classes (...);
CREATE TABLE students (...);
CREATE TABLE exams (...);
CREATE TABLE homework (...);
CREATE TABLE submissions (...);
CREATE TABLE questions (...);
```

### Query Model (MongoDB)

#### Read Operations
- Real-time dashboard updates
- Analytics calculations
- Progress tracking
- Performance comparisons

#### Aggregation Pipeline Examples

```javascript
// Real-time class performance
const classPerformance = db.class_analytics.aggregate([
  { $match: { class_id: "uuid", date: { $gte: startDate } } },
  { $group: { 
      _id: "$topic",
      average_score: { $avg: "$score" },
      participation: { $avg: "$participation" }
    }
  }
]);

// Student progress over time
const studentProgress = db.student_progress.aggregate([
  { $match: { student_id: "uuid" } },
  { $sort: { date: 1 } },
  { $project: {
      date: 1,
      cumulative_score: { $avg: "$daily_scores" },
      improvement: { $subtract: ["$current_score", "$previous_score"] }
    }
  }
]);
```

## WebSocket Integration

### Real-time Data Flow

#### Publisher Service (Node.js)
```javascript
// Emit updates when data changes
const emitAnalyticsUpdate = (userId, data) => {
  io.to(`user_${userId}`).emit('analytics_update', data);
};

const emitClassUpdate = (classId, data) => {
  io.to(`class_${classId}`).emit('class_update', data);
};
```

#### Client Subscription
```javascript
// Teacher dashboard
socket.on('class_update', (data) => {
  updateClassAnalytics(data);
});

// Parent dashboard
socket.on('analytics_update', (data) => {
  updateStudentProgress(data);
});
```

### Event Triggers for MongoDB Updates

#### When to Update MongoDB
1. **Student submits answer** → Update student progress
2. **Teacher grades submission** → Update class analytics
3. **New student joins class** → Update class statistics
4. **Exam completed** → Update institution metrics

#### Event Processing
```javascript
// Event handler for submission completion
const handleSubmissionComplete = async (submission) => {
  // 1. Update PostgreSQL (submission record)
  await Submission.create(submission);
  
  // 2. Calculate new metrics
  const newMetrics = await calculateMetrics(submission);
  
  // 3. Update MongoDB
  await StudentProgress.updateOne(
    { student_id: submission.student_id },
    { $set: newMetrics }
  );
  
  // 4. Emit real-time update
  emitAnalyticsUpdate(submission.student_id, newMetrics);
};
```

## Updated Implementation Roadmap

### Phase 1: Foundation (Weeks 1-6)
- **PostgreSQL Schema**: Core entities and relationships
- **MongoDB Setup**: Collections and indexes
- **CQRS Infrastructure**: Event bus, data synchronization
- **WebSocket Setup**: Real-time connection handling

### Phase 2: Analytics Engine (Weeks 7-10)
- **MongoDB Aggregation Pipelines**: Pre-calculated metrics
- **Real-time Updates**: Event-driven data sync
- **WebSocket Integration**: Live dashboard updates
- **Performance Optimization**: Query optimization

### Phase 3: AI Integration (Weeks 11-14)
- **Assessment AI**: Answer evaluation and feedback
- **Practice AI**: Interactive problem solving
- **Analytics AI**: Predictive performance insights
- **Real-time AI Updates**: Live feedback during practice

### Phase 4: Scaling & Optimization (Weeks 15-18)
- **MongoDB Sharding**: Horizontal scaling for analytics
- **Caching Strategy**: Redis for frequently accessed data
- **Load Balancing**: WebSocket connection management
- **Monitoring**: Performance metrics and alerts

## Technology Stack Updates

### Database Layer
- **PostgreSQL**: Primary transactional database
- **MongoDB**: Analytics and real-time data
- **Redis**: Caching and session management
- **Elasticsearch**: Full-text search for questions

### Backend Services
- **NestJS**: API gateway and command handling
- **Node.js Workers**: Background analytics processing
- **Socket.io**: Real-time WebSocket communication
- **Bull Queue**: Background job processing

### Infrastructure
- **Docker**: Container orchestration
- **Kubernetes**: Auto-scaling for analytics services
- **AWS RDS**: PostgreSQL hosting
- **MongoDB Atlas**: Managed MongoDB
- **Redis Cloud**: Caching service

## Performance Considerations

### MongoDB Optimization
- **Indexes**: Compound indexes for common queries
- **Aggregation**: Pre-calculated views for dashboards
- **TTL**: Automatic cleanup of old analytics data
- **Sharding**: Based on institution_id for scalability

### WebSocket Optimization
- **Room-based Architecture**: Separate rooms for classes, students, teachers
- **Message Compression**: Reduce bandwidth usage
- **Connection Pooling**: Efficient connection management
- **Fallback Mechanism**: Polling for WebSocket failures

## Security & Privacy

### Data Segregation
- **Institution-level Isolation**: Separate MongoDB collections per institution
- **Role-based Access**: WebSocket room permissions
- **Data Encryption**: At-rest and in-transit
- **Audit Logging**: All analytics access tracked

This updated architecture provides the foundation for real-time analytics while maintaining system scalability and performance for the enhanced Ilmino platform.
