const pg = require('pg');
const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});

class DB {
    async insertStudent(id, name, age, dept) {
        //auto-sanitized
        return this.client.query("INSERT INTO Student(ID, Name, Age, Dept) VALUES($1, $2, $3, $4)", [id, name, age, dept]);
    }
    async insertCourse(id, name, capacity, creditHour, requirement) {
        //throws on bad XML
        return this.client.query("INSERT INTO Course(CourseID, CourseName, Capacity, RemainCapacity, CreditHours, Requirement) VALUES($1, $2, $3, $4, $5, XMLPARSE(CONTENT $6))", [id, name, capacity, capacity, creditHour, requirement]);
    }
    async deleteStudent(id) {
        //does not remove associated registrations as it is not in the spec
        return this.client.query("DELETE FROM Student WHERE ID = $1", [id]);
    }
    async deleteCourse(id) {
        //does not remove associated registrations as it is not in the spec
        return this.client.query("DELETE FROM Course WHERE CourseID = $1", [id]);
    }
    async studentCount(courseId) {
        return this.client.query("SELECT COUNT(StudentID) FROM Registration WHERE CourseID = $1 GROUP BY CourseID", [courseId]);
    }
    async studentSatisfiesRequirements(studentId, courseId) {

    }
    async registerToCourse(studentId, courseId) {
        await this.client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE");
        await this.client.query("INSERT INTO Registration(StudentID, CourseID) SELECT $1, $2 FROM Course WHERE CourseID = $2 AND RemainCapacity > 0", [studentId, courseId]);
        await this.client.query("UPDATE Course SET RemainCapacity = RemainCapacity - 1 WHERE CourseID = $1 AND RemainCapacity > 0", [courseId]);
        return this.client.query("COMMIT");
    }
    async unregisterFromCourse(studentId, courseId) {
        await this.client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE");
        await this.client.query("DELETE FROM Registration WHERE StudentID = $1 AND CourseID = $2", [studentId, courseId]);
        await this.client.query("UPDATE Course SET RemainCapacity = RemainCapacity + 1 WHERE CourseId = $1", [courseId]);
        return this.client.query("COMMIT");
    }
    async updateCourseCapacity(courseId, capacity) {
        await this.client.query("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE");
        await this.client.query("UPDATE Course SET Capacity = $2, RemainCapacity = RemainCapacity + $2 - Capacity  WHERE CourseId = $1 AND RemainCapacity + $2 - Capacity >= 0", [courseId, capacity]);
        return this.client.query("COMMIT");
    }
    async getCourseHistory(studentId) {
        return this.client.query("SELECT CourseID FROM Registration WHERE StudentID = $1", [studentId]);
    }
    async getFailHistory(studentId) {
        return this.client.query("SELECT CourseID, Grade FROM Registration WHERE StudentID = $1 AND Grade < 60", [studentId]);
    }
    async updateGrade(studentId, courseId, grade) {
        return this.client.query("UPDATE Registration SET Grade = $3 WHERE StudentId = $1 AND CourseId = $2");
    }
    async computeGPA(studentID) {
        //simplifying assumption: gpa scales linearly from [60, 100] -> [1, 4].
        //for discrete GPA we can use SELECT AVG(CASE WHEN Grade >= 90 THEN 4 WHEN Grade >= 80 THEN 3 WHEN Grade >= 70 THEN 2 ...
        return this.client.query("SELECT AVG((Grade-60)/40*3+1) FROM Registration WHERE StudentID = $1 AND Grade IS NOT NULL");
    }
    async computeCourseGradeAverage(courseId) {
        return this.client.query("SELECT AVG(Grade) FROM Registration WHERE CourseID = $1 AND Grade IS NOT NULL");
    }
    async close() {
        return this.client.end();
    }
    async connect() {
        return this.client.connect();
    }
    constructor(s) {
        this.client = new pg.Client(s);
    }
}


const db = new DB('postgres://postgres:pass@localhost:5432');