# Entity Relationship Diagram (ERD) - Teachers and Students

## Entity Relationship Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                Entity Relationship Model                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     TEACHER     │    │      USER       │    │    STUDENT      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ teacher_id (PK) │    │ user_id (PK)    │    │ student_id (PK) │
│ user_id (FK)    │◄───┤ first_name      │───►│ user_id (FK)    │
│ employee_id     │    │ last_name       │    │ student_number  │
│ department      │    │ email           │    │ course          │
│ subjects        │    │ password        │    │ year            │
│ hire_date       │    │ contact_number  │    │ section         │
│ status          │    │ role            │    │ gender          │
│ salary          │    │ created_at      │    │ birthdate       │
│ qualifications  │    │ updated_at      │    │ enrollment_date │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         │              ┌────────▼────────┐              │
         │              │   VIOLATION     │              │
         │              ├─────────────────┤              │
         │              │ violation_id(PK)│              │
         │              │ student_id (FK) │◄─────────────┘
         │              │ teacher_id (FK) │
         │              │ type            │
         │              │ severity        │
         │              │ description     │
         │              │ date_reported   │
         │              │ status          │
         │              │ admin_reviewed  │
         │              └─────────────────┘
         │
         │              ┌─────────────────┐
         │              │   MEETING       │
         │              ├─────────────────┤
         │              │ meeting_id (PK) │
         │              │ student_id (FK) │◄─────────────┐
         │              │ teacher_id (FK) │              │
         │              │ location        │              │
         │              │ purpose         │              │
         │              │ date            │              │
         │              │ time            │              │
         │              │ description     │              │
         │              └─────────────────┘              │
         │                                               │
         │              ┌─────────────────┐              │
         │              │  NOTIFICATION   │              │
         │              ├─────────────────┤              │
         │              │ notification_id │              │
         │              │ user_id (FK)    │◄─────────────┘
         │              │ type            │
         │              │ title           │
         │              │ message         │
         │              │ read            │
         │              │ created_at      │
         │              └─────────────────┘
         │
         │              ┌─────────────────┐
         │              │  ANNOUNCEMENT   │
         │              ├─────────────────┤
         │              │ announcement_id │
         │              │ title           │
         │              │ description     │
         │              │ created_by (FK) │◄─────────────┐
         │              │ created_at      │              │
         │              │ updated_at      │              │
         │              └─────────────────┘              │
         │                                               │
         │              ┌─────────────────┐              │
         │              │   LOSTFOUND     │              │
         │              ├─────────────────┤              │
         │              │ lostfound_id    │              │
         │              │ user_id (FK)    │◄─────────────┘
         │              │ item_name       │
         │              │ description     │
         │              │ status          │
         │              │ reported_date   │
         │              │ created_at      │
         │              └─────────────────┘
         │
         │              ┌─────────────────┐
         │              │   ACTIVITY      │
         │              ├─────────────────┤
         │              │ activity_id     │
         │              │ name            │
         │              │ description     │
         │              │ date            │
         │              │ created_by (FK) │◄─────────────┐
         │              │ created_at      │              │
         │              └─────────────────┘              │
         │                                               │
         │              ┌─────────────────┐              │
         │              │ USER_PREFERENCES│              │
         │              ├─────────────────┤              │
         │              │ uid (PK)        │              │
         │              │ email           │              │
         │              │ theme           │              │
         │              │ language        │              │
         │              │ notifications   │              │
         │              │ created_at      │              │
         │              └─────────────────┘              │
         │                                               │
         └───────────────────────────────────────────────┘
```

## Data Dictionary

### USER TABLE
| Field Name    | Data Type | Size | Description                    | Example        |
|---------------|-----------|------|--------------------------------|----------------|
| user_id       | string    | 50   | Unique user identifier         | "abc123def456" |
| first_name    | string    | 100  | User's first name              | "John"         |
| last_name     | string    | 100  | User's last name               | "Doe"          |
| email         | string    | 255  | User's email address           | "john@email.com" |
| password      | string    | 255  | Encrypted password             | "hashed_pass"  |
| contact_number| string    | 20   | Phone number                   | "+1234567890"  |
| role          | string    | 20   | User role (Student/Teacher/Admin) | "Student"    |
| created_at    | timestamp | -    | Account creation date          | "2024-01-15"   |
| updated_at    | timestamp | -    | Last update date               | "2024-01-20"   |

### TEACHER TABLE
| Field Name     | Data Type | Size | Description                    | Example        |
|----------------|-----------|------|--------------------------------|----------------|
| teacher_id     | string    | 50   | Unique teacher identifier      | "T001"         |
| user_id        | string    | 50   | Foreign key to USER table      | "abc123def456" |
| employee_id    | string    | 20   | Employee identification number | "EMP001"       |
| department     | string    | 100  | Department/Subject area         | "Computer Science" |
| subjects       | array     | -    | List of subjects taught        | ["Math", "Physics"] |
| hire_date      | date      | -    | Date of employment             | "2020-09-01"   |
| status         | string    | 20   | Employment status              | "active"       |
| salary         | decimal   | 10,2 | Monthly salary                 | 50000.00       |
| qualifications | string    | 500  | Educational qualifications     | "MS Computer Science" |

### STUDENT TABLE
| Field Name      | Data Type | Size | Description                    | Example        |
|-----------------|-----------|------|--------------------------------|----------------|
| student_id      | string    | 50   | Unique student identifier      | "S001"         |
| user_id         | string    | 50   | Foreign key to USER table      | "abc123def456" |
| student_number  | string    | 20   | Student identification number  | "2024-001"     |
| course          | string    | 50   | Academic course/program        | "BSIT"         |
| year            | string    | 20   | Academic year level            | "2nd Year"     |
| section         | string    | 10   | Class section                  | "A"            |
| gender          | string    | 10   | Student gender                 | "Male"         |
| birthdate       | date      | -    | Date of birth                  | "2000-05-15"   |
| enrollment_date | date      | -    | Date of enrollment             | "2023-09-01"   |

### VIOLATION TABLE
| Field Name      | Data Type | Size | Description                    | Example        |
|-----------------|-----------|------|--------------------------------|----------------|
| violation_id    | string    | 50   | Unique violation identifier    | "V001"         |
| student_id      | string    | 50   | Foreign key to STUDENT table   | "S001"         |
| teacher_id      | string    | 50   | Foreign key to TEACHER table   | "T001"         |
| type            | string    | 100  | Type of violation              | "Academic Dishonesty" |
| severity        | string    | 20   | Severity level                 | "High"         |
| description     | text      | 1000 | Detailed description           | "Caught cheating on exam" |
| date_reported   | date      | -    | Date violation was reported    | "2024-01-15"   |
| status          | string    | 20   | Current status                 | "Pending"      |
| admin_reviewed  | boolean   | -    | Whether admin has reviewed     | false          |

### MEETING TABLE
| Field Name   | Data Type | Size | Description                    | Example        |
|--------------|-----------|------|--------------------------------|----------------|
| meeting_id   | string    | 50   | Unique meeting identifier      | "M001"         |
| student_id   | string    | 50   | Foreign key to STUDENT table   | "S001"         |
| teacher_id   | string    | 50   | Foreign key to TEACHER table   | "T001"         |
| location     | string    | 100  | Meeting location               | "Room 101"     |
| purpose      | string    | 200  | Purpose of meeting              | "Violation Discussion" |
| date         | date      | -    | Meeting date                   | "2024-01-20"   |
| time         | time      | -    | Meeting time                   | "14:30"        |
| description  | text      | 500  | Meeting description            | "Discuss violation consequences" |

### NOTIFICATION TABLE
| Field Name     | Data Type | Size | Description                    | Example        |
|----------------|-----------|------|--------------------------------|----------------|
| notification_id| string    | 50   | Unique notification identifier | "N001"         |
| user_id        | string    | 50   | Foreign key to USER table      | "abc123def456" |
| type           | string    | 50   | Notification type              | "violation"    |
| title          | string    | 200  | Notification title             | "Violation Report" |
| message        | text      | 1000 | Notification message           | "You have a new violation report" |
| read           | boolean   | -    | Whether notification is read   | false          |
| created_at     | timestamp | -    | Creation timestamp             | "2024-01-15T10:30:00Z" |

### ANNOUNCEMENT TABLE
| Field Name      | Data Type | Size | Description                    | Example        |
|-----------------|-----------|------|--------------------------------|----------------|
| announcement_id | string    | 50   | Unique announcement identifier | "A001"         |
| title           | string    | 200  | Announcement title             | "School Closure" |
| description     | text      | 2000 | Announcement content           | "School will be closed tomorrow" |
| created_by      | string    | 50   | Foreign key to USER table      | "abc123def456" |
| created_at      | timestamp | -    | Creation timestamp             | "2024-01-15T10:30:00Z" |
| updated_at      | timestamp | -    | Last update timestamp          | "2024-01-15T10:30:00Z" |

### LOSTFOUND TABLE
| Field Name    | Data Type | Size | Description                    | Example        |
|---------------|-----------|------|--------------------------------|----------------|
| lostfound_id  | string    | 50   | Unique lost & found identifier | "LF001"        |
| user_id       | string    | 50   | Foreign key to USER table      | "abc123def456" |
| item_name     | string    | 200  | Name of lost/found item        | "Black Backpack" |
| description   | text      | 500  | Item description               | "Nike backpack with laptop" |
| status        | string    | 20   | Current status                 | "found"        |
| reported_date | date      | -    | Date item was reported         | "2024-01-15"   |
| created_at    | timestamp | -    | Creation timestamp             | "2024-01-15T10:30:00Z" |

### ACTIVITY TABLE
| Field Name   | Data Type | Size | Description                    | Example        |
|--------------|-----------|------|--------------------------------|----------------|
| activity_id  | string    | 50   | Unique activity identifier     | "ACT001"       |
| name         | string    | 200  | Activity name                  | "School Assembly" |
| description  | text      | 1000 | Activity description           | "Monthly school assembly" |
| date         | date      | -    | Activity date                  | "2024-01-20"   |
| created_by   | string    | 50   | Foreign key to USER table      | "abc123def456" |
| created_at   | timestamp | -    | Creation timestamp             | "2024-01-15T10:30:00Z" |

### USER_PREFERENCES TABLE
| Field Name     | Data Type | Size | Description                    | Example        |
|----------------|-----------|------|--------------------------------|----------------|
| uid            | string    | 50   | Primary key, foreign key to USER | "abc123def456" |
| email          | string    | 255  | User's email address           | "john@email.com" |
| theme          | string    | 20   | UI theme preference            | "light"        |
| language       | string    | 10   | Language preference            | "en"           |
| notifications  | object    | -    | Notification preferences       | {"email": true} |
| created_at     | timestamp | -    | Creation timestamp             | "2024-01-15T10:30:00Z" |

