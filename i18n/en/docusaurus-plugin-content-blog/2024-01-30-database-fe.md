---
title: Basic Information Database Summary
tags: [Database]
authoors: hikari
---

## Relational Model
### Correspondence between Relational Model and Relational Database
| Relational Model | Relational Database |
|:-:-:|:-:-:|
| Relation | Table |
| Attribute | Column |
| Tuple | Row |
| Domain | Data type. A set of values that an attribute can take. |

- No order to attributes
- Attribute names are unique within a relation
- Attribute names must always be given names

(Basic Information Technology Engineer Examination, Spring 2016, Problem 26)
(Basic Information Technology Engineer Examination, Spring 2019, Problem 26)

## Relational Database, Relational Database (RDB)
A relational database represents data using two-dimensional tables.

(Basic Information Technology Engineer Examination, Autumn 2011, Problem 31)

## Schema
A schema is a collection of data definitions, such as data properties, formats, and relationships with other data.

(Basic Information Technology Engineer Examination, Autumn 2014, Problem 26)

### 3-Layer Schema
A 3-layer schema consists of:
- External schema: Visible to users
- Conceptual schema: Visible to developers
- Internal schema: Physical structure

The purpose of a 3-layer schema is to ensure that changes to the physical storage structure of data do not affect application programs.

(Basic Information Technology Engineer Examination, Spring 2015, Problem 26)

## Database Management System (DBMS)
Software that manages databases.

| Function | Overview |
|:-:-:|:-:-:|
| Integrity Maintenance | Function to maintain data integrity through exclusive control, referential constraints, and table constraints |
| Disaster Recovery | Function to recover from database failures using rollback, forward roll, checkpoints, and logs |
| Confidentiality Protection | Function to prevent data tampering and leakage |

(Basic Information Technology Engineer Examination, Spring 2001, Problem 70)

## E-R Diagram (Entity-Relationship Diagram)
An E-R diagram shows the relationships between entities.
An entity is a real-world object.

(Basic Information Technology Engineer Examination, Spring 2016, Problem 38)

## Table Design
### Primary Key (PK)
A column that uniquely identifies a row in a table.

- Uniqueness constraint
- NOT NULL constraint
- Not necessarily at the beginning
- Can also be a composite key (combination of multiple columns)

(Basic Information Technology Engineer Examination, Autumn 2013, Problem 30)

### Foreign Key (FK)
A column that references the primary key of another table.

- Referential constraint (constraint to maintain referential integrity)

(Basic Information Technology Engineer Examination, Spring 2016, Problem 29)

A **relation** is the relationship between tables using primary and foreign keys.

## Data Normalization
Eliminating data redundancy and inconsistencies when constructing a database.

(Basic Information Technology Engineer Examination, Spring 2015, Problem 67)
(Basic Information Technology Engineer Examination, Autumn 2016, Problem 67)
(Basic Information Technology Engineer Examination, Autumn 2018, Problem 61)

### First Normal Form
- Eliminate repeating items
- Eliminate items that can be calculated

### Second Normal Form
Move items that are uniquely determined by only a part of the primary key to a separate table.

- Partial functional dependency: A relationship where an item is uniquely determined by only a part of the primary key.
- Fully functional dependency: A relationship where an item is uniquely determined by the primary key.

### Third Normal Form
Move items that are determined by other items besides the primary key to a separate table.

- Transitive functional dependency: A relationship where an item is uniquely determined by items other than the primary key.

## SQL
### DDL, Data Definition Language
#### CREATE TABLE
Creates a table.
Corresponds to the conceptual schema. Represents the physical table.

```sql
CREATE TABLE TableName(ColumnName1 Type1, ...);
```

#### CREATE VIEW
Defines a view.
Corresponds to the external schema. Represents a virtual table.

### DML, Data Manipulation Language
#### SELECT
Performs a query (request).

```sql
SELECT Column, ... FROM Table, ... WHERE Conditions
```

- Projection
Operation to retrieve columns.
> To retrieve `Col`,

```sql
SELECT Col FROM Table
```

- Selection
Operation to retrieve rows.
> To retrieve rows where `Price` is 100 or 120,

```sql
SELECT * FROM Table WHERE Price=100 OR Price=120
```

```sql
SELECT * FROM Table WHERE Price IN (100, 120)
```

> To retrieve rows where `Price` is between 100 and 200,

```sql
SELECT * FROM Table WHERE Price >= 100 AND Price <= 200
```

```sql
SELECT * FROM Table WHERE BETWEEN 100 AND 200
```

> To retrieve rows where `Name` ends with "田",

```sql
SELECT * FROM Table WHERE Name LIKE "%田"
```

- %: Matches 0 or more characters
- _: Matches 1 or more characters

### Join
- DISTINCT: Combines duplicate rows into one.

### Sorting (ORDER BY)
#### Ascending (ASC)
```sql
SELECT ... FROM ... ORDER BY ColumnName ASC
```

`ASC` is optional.

#### Descending (DESC)
```sql
SELECT ... FROM ... ORDER BY ColumnName DESC
```

### Aggregate Functions

| Function | Meaning |
|:-:-:|:-:-:|
| AVG | Average |
| COUNT | Number of rows |
| MIN | Minimum value |
| MAX | Maximum value |
| SUM | Sum |

### Grouping (GROUP BY)
```sql
SELECT ... FROM ... GROUP BY ColumnName
```

### Alias (AS)
```sql
SUM(ColumnName) AS GOUKEI
```

### Group Conditions (HAVING)
```sql
GROUP BY ColumnName HAVING ...
```

### Include Rows (IN)
```sql
... WHERE IN (SELECT ...)
```

Not included rows use `NOT IN`

### Correlated Subquery (EXISTS)
True if it exists

```sql
... WHERE EXISTS (SELECT ...)
```

## Database Utilization
### Data Warehouse
A place to accumulate large amounts of data obtained through various business activities for decision support.

(Basic Information Technology Engineer Examination, Spring 2010, Problem 33)

### Data Mining
A technique to **discover** useful information and relationships from vast amounts of data held by companies, such as customer and market data.

(Basic Information Technology Engineer Examination, Autumn 2015, Problem 38)
(Basic Information Technology Engineer Examination, Spring 2020, Problem 64)
(Basic Information Technology Engineer Examination, Spring 2020, Problem 29)

### Big Data
- Diverse data such as SNS, videos, images, and audio.
- Massive data volume.
- Data collected in real-time.

(Basic Information Technology Engineer Examination, Spring 2020, Problem 63)

### Open Data
Government and private data that can be freely reused in principle.
