# Data Preparation Guide for Math Pilot V2

This document provides instructions for the Data Team on how to prepare question data for ingestion into the Math Pilot V2 backend.

## Overview

The data should be provided in a **XLSX** format following the structure defined in `question_data_template.xlsx`. Each row in the XLSX represents a single question along with its associated metadata, context (topic/module), and solution.
Each file represents a module (for e.g. _Pure Mathematics_) from a subject (for e.g. _Mathematics_, _Physics_, _Chemistry_, _Biology_) under an age-level (for e.g. _GCSE_, _A_Level_) under a board (for e.g. _AQA_, _Edexcel_, _Pearson Edexcel_, _OCR_). Each sheet in an excel file represents a topic (for e.g. _Quadratics_) and content for each topic will be divided among different sheets in a file for a module.

## Column Definitions

### 1. Classification & Context (Required)

These columns categorize where the question belongs in the curriculum hierarchy.

| Column Name     | Required | Description            | Example                    |
| --------------- | -------- | ---------------------- | -------------------------- |
| `subtopic_name` | Yes      | The granular subtopic. | `Solving by Factorisation` |

### 2. Question Details (Required)

Core attributes of the question.

| Column Name           | Required | Description                                                              | Example                    |
| --------------------- | -------- | ------------------------------------------------------------------------ | -------------------------- |
| `question_type`       | Yes      | The type of question. Must be `MCQ`, `Boolean`, or `Descriptive`.        | `MCQ`                      |
| `serial_no`           | Yes      | The serial number for the question. Must be a number.                    | `1`                        |
| `question_title`      | Yes      | An internal identifier or title for the question.                        | `Q1_2023_Summer`           |
| `question_text`       | Yes      | The actual text of the question.                                         | `Solve for x: x^2 - 4 = 0` |
| `question_image`      | Yes      | The filename of the image file.                                          | `Q1_2023_Summer.png`       |
| `on_canvas`           | Yes      | Indicates if the question needs a canvas to answer. Values: `Yes`, `No`. | `Yes`                      |
| `question_difficulty` | Yes      | Difficulty rating. Values: `Easy`, `Medium`, `Hard`.                     | `Medium`                   |
| `total_marks`         | Yes      | Integer value of marks assigned.                                         | `1`                        |
| `time_limit_in_min`   | Yes      | Recommended time in minutes.                                             | `2`                        |
| `question_for`        | Yes      | Intended usage. Values: `Practice`, `Mock`.                              | `Practice`                 |

### 3. Past Paper Context (Optional)

If the question is from a specific past paper, fill these fields.

| Column Name         | Description             | Example                 |
| ------------------- | ----------------------- | ----------------------- |
| `past_paper_name`   | Name of the past paper. | `May/June 2023 Paper 1` |
| `past_paper_year`   | Year of the paper.      | `2023`                  |
| `past_paper_season` | Season of the paper.    | `Summer`                |

### 4. Solution - MCQ (Required if question_type = 'MCQ')

Provide up to 4 options. Mark exactly one as `TRUE` for `is_correct`.

| Column Name          | Description              | Example |
| -------------------- | ------------------------ | ------- |
| `mcq_option_1_text`  | Text for Option 1.       | `2`     |
| `mcq_option_2_text`  | Text for Option 2.       | `-2`    |
| `mcq_option_3_text`  | Text for Option 3.       | `3`     |
| `mcq_option_4_text`  | Text for Option 4.       | `-4`    |
| `mcq_correct_option` | Text for correct option. | `2`     |

### 5. Solution - Boolean (Required if question_type = 'Boolean')

Provide up to 2 options. Mark exactly one as `TRUE` for `is_correct`.

| Column Name          | Description              | Example |
| -------------------- | ------------------------ | ------- |
| `mcq_option_1_text`  | Text for Option 1.       | `True`  |
| `mcq_option_2_text`  | Text for Option 2.       | `False` |
| `mcq_correct_option` | Text for correct option. | `True`  |

### 6. Solution - Descriptive (Required if question_type = 'Descriptive')

| Column Name      | Description                        | Example                       |
| ---------------- | ---------------------------------- | ----------------------------- |
| `solution_image` | File name for solution image.      | `Q1_2023_Summer_Solution.png` |
| `solution_text`  | The model answer or solution text. | `x = 2 or x = -2`             |

### 7. Additional Info (Optional)

| Column Name   | Description                         | Example                         |
| ------------- | ----------------------------------- | ------------------------------- |
| `explanation` | Detailed explanation of the answer. | `Factorise as (x-2)(x+2)`       |
| `hint`        | A hint to help the student.         | `Use difference of two squares` |

## Data Formatting Rules

1. **Enums are Case-Sensitive**: Please use the exact casing for Enums (e.g., `Mathematics` not `mathematics`, `MCQ` not `mcq`).
2. **Booleans**: Use `TRUE` or `FALSE` for boolean fields.
3. **Missing Values**: Leave optional cells empty if no data is available.
4. **Special Characters**: If `question_text` contains commas, wrap the entire text in double quotes (e.g., `"Find x, y, and z"`).

## Database Mapping Reference

For the backend team, this data maps to the following Prisma models:

- **Hierarchy**: `BoardAgeLevel` -> `Module` -> `Topic` -> `Subtopic`
- **Question**: `Question` model
- **Solutions**: `SolutionBase` -> `SolutionMcq` or `SolutionDescriptive`
- **Past Paper**: `PastPaper` model (linked via `QuestionSet`)
