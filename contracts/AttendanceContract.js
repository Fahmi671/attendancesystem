const fs = require('fs-extra');
const crypto = require('crypto');

const LEDGER_FILE = './ledger/ledger.json';
const STATE_FILE = './ledger/state.json';

class AttendanceContract {
  constructor() {
    console.log('\n[INIT] Initializing AttendanceContract...');
    
    //Load existing ledger and state from files
    this.ledger = fs.readJsonSync(LEDGER_FILE, { throws: false }) || [];
    this.state = fs.readJsonSync(STATE_FILE, { throws: false }) || {};

    //Create genesis block if ledger is empty
    if (this.ledger.length === 0) {
      console.log('[INIT] No blockchain found. Creating GENESIS block...');
      const genesisBlock = {
        index: 0,
        timestamp: new Date().toISOString(),
        transactionType: 'GENESIS',
        data: { message: 'genesis' },
        previousHash: '0',
        hash: this._hashBlock({
          index: 0,
          timestamp: new Date().toISOString(),
          transactionType: 'GENESIS',
          data: { message: 'genesis' },
          previousHash: '0'
        })
      };
      this.ledger.push(genesisBlock);
      this._saveLedger();
      console.log('[INIT] Genesis block created.');
    } else {
      console.log(`[INIT] Loaded blockchain with ${this.ledger.length} blocks.`);
    }
  }

  //Generate unique attendance ID
  _generateAttendanceID() {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = Object.keys(this.state).filter(id => id.startsWith(`ATT-${date}`)).length + 1;
    return `ATT-${date}-${String(count).padStart(3, '0')}`;
  }

  //Hash a block using SHA-256
  _hashBlock(block) {
    const blockString = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      transactionType: block.transactionType,
      data: block.data,
      previousHash: block.previousHash
    });
    return crypto.createHash('sha256').update(blockString).digest('hex');
  }

  //Compute verification hash for a record
  _computeVerificationHash(record) {
    const recordString = JSON.stringify(record);
    return crypto.createHash('sha256').update(recordString).digest('hex');
  }

  //Create a new block and add it to ledger
  _createBlock(transactionType, data) {
    const previousBlock = this.ledger[this.ledger.length - 1];
    
    const block = {
      index: this.ledger.length,
      timestamp: new Date().toISOString(),
      transactionType,
      data,
      previousHash: previousBlock.hash,
      hash: null
    };

    block.hash = this._hashBlock(block);
    return block;
  }

  //Save ledger and state to files
  _saveLedger() {
    fs.writeJsonSync(LEDGER_FILE, this.ledger, { spaces: 2 });
    fs.writeJsonSync(STATE_FILE, this.state, { spaces: 2 });
  }

  //CREATE: Add new attendance record
  async createAttendance(studentID, studentName, courseCode, courseName, date, time, lecturerID, lecturerName, status) {
    try {
      //Check all fields are provided
      if (!studentID || !studentName || !courseCode || !courseName || !date || !time || !lecturerID || !lecturerName || !status) {
        throw new Error('All fields are required.');
      }

      //Check status is valid
      const validStatuses = ['Present', 'Absent', 'Late'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status. Must be Present, Absent, or Late.');
      }

      //Check date is not in future
      const recordDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (recordDate > today) {
        throw new Error('Attendance date cannot be in the future.');
      }

      //Check for duplicate records
      for (const recordID in this.state) {
        const record = this.state[recordID];
        if (record.studentID === studentID && 
            record.courseCode === courseCode && 
            record.date === date && 
            !record.isDeleted) {
          throw new Error('Attendance record already exists for this student, course, and date.');
        }
      }

      const attendanceID = this._generateAttendanceID();
      const now = new Date().toISOString();

      //Create attendance record
      const record = {
        attendanceID,
        studentID,
        studentName,
        courseCode,
        courseName,
        date,
        time,
        status,
        lecturerID,
        lecturerName,
        createdAt: now,
        updatedAt: now,
        updateReason: 'Initial attendance record',
        isDeleted: false,
        verificationHash: ''
      };

      record.verificationHash = this._computeVerificationHash(record);

      //Create block and save
      const block = this._createBlock('ATTENDANCE_CREATE', record);
      this.ledger.push(block);
      this.state[attendanceID] = record;
      this._saveLedger();

      return { success: true, record, block };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  //READ: Get attendance record by ID
  async readAttendance(attendanceID) {
    try {
      if (!attendanceID) {
        throw new Error('Attendance ID is required.');
      }

      const record = this.state[attendanceID];
      if (!record) {
        throw new Error(`Record not found: ${attendanceID}`);
      }

      return { success: true, record };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  //UPDATE: Change attendance status
  async updateAttendance(attendanceID, newStatus, updateReason) {
    try {
      if (!attendanceID || !newStatus || !updateReason) {
        throw new Error('Attendance ID, new status, and reason are required.');
      }

      //Check status is valid
      const validStatuses = ['Present', 'Absent', 'Late'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid status. Must be Present, Absent, or Late.');
      }

      //FIX: Deep clone the record to prevent pass-by-reference mutation of older blocks
      const record = JSON.parse(JSON.stringify(this.state[attendanceID]));
      
      if (!record) {
        throw new Error(`Record not found: ${attendanceID}`);
      }

      //Check record is not deleted
      if (record.isDeleted) {
        throw new Error('Cannot update deleted records.');
      }

      //Update record
      record.status = newStatus;
      record.updateReason = updateReason;
      record.updatedAt = new Date().toISOString();
      record.verificationHash = this._computeVerificationHash(record);

      //Create block and save
      const block = this._createBlock('ATTENDANCE_UPDATE', record);
      this.ledger.push(block);
      this.state[attendanceID] = record;
      this._saveLedger();

      return { success: true, record, block };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  //DELETE: Soft delete attendance record
  async deleteAttendance(attendanceID, deletionReason) {
    try {
      if (!attendanceID || !deletionReason) {
        throw new Error('Attendance ID and deletion reason are required.');
      }

      //FIX: Deep clone the record to prevent pass-by-reference mutation of older blocks
      const record = JSON.parse(JSON.stringify(this.state[attendanceID]));
      
      if (!record) {
        throw new Error(`Record not found: ${attendanceID}`);
      }

      //Check record is not already deleted
      if (record.isDeleted) {
        throw new Error('Record is already deleted.');
      }

      //Soft delete - mark as deleted but keep in ledger
      record.isDeleted = true;
      record.updateReason = deletionReason;
      record.updatedAt = new Date().toISOString();
      record.verificationHash = this._computeVerificationHash(record);

      //Create block and save
      const block = this._createBlock('ATTENDANCE_DELETE', record);
      this.ledger.push(block);
      this.state[attendanceID] = record;
      this._saveLedger();

      return { success: true, record, block };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  //QUERY: Get all records for a student in a course
  async getStudentAttendance(studentID, courseCode) {
    try {
      if (!studentID || !courseCode) {
        throw new Error('Student ID and course code are required.');
      }

      const records = [];
      let present = 0, absent = 0, late = 0;

      //Find all matching records
      for (const recordID in this.state) {
        const record = this.state[recordID];
        if (record.studentID === studentID && 
            record.courseCode === courseCode && 
            !record.isDeleted) {
          records.push(record);
          
          if (record.status === 'Present') present++;
          else if (record.status === 'Absent') absent++;
          else if (record.status === 'Late') late++;
        }
      }

      return {
        success: true,
        records,
        summary: {
          total: records.length,
          present,
          absent,
          late
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  //QUERY: Get all records for a course on a specific date
  async getCourseAttendance(courseCode, date) {
    try {
      if (!courseCode || !date) {
        throw new Error('Course code and date are required.');
      }

      const records = [];
      let present = 0, absent = 0, late = 0;

      //Find all matching records
      for (const recordID in this.state) {
        const record = this.state[recordID];
        if (record.courseCode === courseCode && 
            record.date === date && 
            !record.isDeleted) {
          records.push(record);
          
          if (record.status === 'Present') present++;
          else if (record.status === 'Absent') absent++;
          else if (record.status === 'Late') late++;
        }
      }

      //Calculate attendance rate
      const total = records.length;
      const attendanceRate = total > 0 ? ((present + late) / total * 100).toFixed(1) : '0.0';

      return {
        success: true,
        records,
        summary: {
          total,
          present,
          absent,
          late,
          attendanceRate: `${attendanceRate}%`
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  //Verify blockchain integrity
  isValidChain(chain = this.ledger) {
    if (!Array.isArray(chain) || chain.length === 0) return false;

    for (let i = 1; i < chain.length; i++) {
      const prevBlock = chain[i - 1];
      const currBlock = chain[i];

      //Check previous hash matches
      if (currBlock.previousHash !== prevBlock.hash) {
        return false;
      }

      //Check current hash is correct
      const recomputedHash = this._hashBlock(currBlock);
      if (recomputedHash !== currBlock.hash) {
        return false;
      }
    }

    return true;
  }

  // Get current blockchain state
  getState() {
    return {
      ledger: this.ledger,
      state: this.state,
      isValid: this.isValidChain()
    };
  }
}

module.exports = AttendanceContract;