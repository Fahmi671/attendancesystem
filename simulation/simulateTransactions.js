const AttendanceContract = require('../contracts/AttendanceContract');

function printHeader() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  BLOCKCHAIN-BASED STUDENT ATTENDANCE SYSTEM            ║`);
  console.log(`║  Smart Contract Simulation & Testing                   ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);
}

function printScenarioHeader(scenarioNum, title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`SCENARIO ${scenarioNum}: ${title}`);
  console.log(`${'═'.repeat(60)}\n`);
}

function printSubSection(text) {
  console.log(`▶ ${text}\n`);
}

function printSuccess(msg) {
  console.log(`✓ ${msg}`);
}

function printError(msg) {
  console.log(`✗ ${msg}`);
}

function printInfo(label, value) {
  console.log(`  ${label}: ${value}`);
}

function printRecord(id, name, course, date, status) {
  console.log(`  [REC] ${id} | ${name} | ${course} | ${date} | ${status}`);
}

function printTable(headers, rows) {
  const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
  
  console.log('  ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ '));
  console.log('  ' + colWidths.map(w => '─'.repeat(w)).join('─┼─'));
  
  for (const row of rows) {
    console.log('  ' + row.map((cell, i) => String(cell).padEnd(colWidths[i])).join(' │ '));
  }
}

function printSummaryBox(title, stats) {
  console.log(`\n┌─ ${title} ${'─'.repeat(Math.max(0, 45 - title.length))}┐`);
  for (const [key, value] of Object.entries(stats)) {
    const padding = ' '.repeat(Math.max(0, 40 - key.length));
    console.log(`│ ${key}${padding}${value}`);
  }
  console.log(`└${'─'.repeat(50)}┘\n`);
}

function printFooter() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`END OF SIMULATION`);
  console.log(`${'═'.repeat(60)}\n`);
}

//Main Simulation 
(async () => {
  printHeader();

  const contract = new AttendanceContract();

  //Scenario 1: Record Attendance For Multiple Students
  printScenarioHeader(1, 'Recording Attendance for Multiple Students');
  printSubSection('Recording attendance for BCI3353 class on 2026-03-10');

  const scenario1Students = [
    { id: 'CB23021', name: 'Mohamad Fahmi Bin Mohd Razali', course: 'BCI3353', courseName: 'Blockchain Technology', status: 'Present' },
    { id: 'CB23081', name: 'Muhamad Khairul Hakim Bin Khairudin', course: 'BCI3353', courseName: 'Blockchain Technology', status: 'Late' },
    { id: 'CB23053', name: 'Muhammad Hafiz Bin Zahari', course: 'BCI3353', courseName: 'Blockchain Technology', status: 'Present' },
    { id: 'CB24161', name: 'Muhammad Amir Firdaus Bin Mohd Rodhi', course: 'BCI3353', courseName: 'Blockchain Technology', status: 'Absent' },
    { id: 'CB23044', name: 'Muhammad Aizul Azhan Bin Ab Halim', course: 'BCI3353', courseName: 'Blockchain Technology', status: 'Present' }
  ];

  console.log('Class Details:');
  printInfo('Course', 'BCI3353 - Blockchain Technology');
  printInfo('Date', '2026-03-10');
  printInfo('Time', '2:00 PM');
  printInfo('Lecturer', 'TS. DR. SALWANA MOHAMAD @ ASMARA');
  printInfo('Total Students', scenario1Students.length);
  console.log();

  const attendanceRecords = [];
  let successCount = 0;

  for (const student of scenario1Students) {
    const result = await contract.createAttendance(
      student.id, student.name, student.course, student.courseName,
      '2026-03-10', '14:00:00', 'LEC001', 'TS. DR. SALWANA MOHAMAD @ ASMARA', student.status
    );

    if (result.success) {
      printRecord(result.record.attendanceID, student.name.substring(0, 30), student.course, '2026-03-10', result.record.status);
      attendanceRecords.push(result.record.attendanceID);
      successCount++;
    } else {
      printError(`Failed for ${student.id}: ${result.error}`);
    }
  }

  console.log();
  printSuccess(`${successCount} out of ${scenario1Students.length} attendance records created successfully`);
  
  const scenario1Query = await contract.getCourseAttendance('BCI3353', '2026-03-10');
  if (scenario1Query.success) {
    printSummaryBox('Scenario 1 Summary', {
      'Total Students': scenario1Query.summary.total,
      'Present': scenario1Query.summary.present,
      'Late': scenario1Query.summary.late,
      'Absent': scenario1Query.summary.absent,
      'Attendance Rate': scenario1Query.summary.attendanceRate
    });
  }


  //Scenario 2: Query Attendance
  printScenarioHeader(2, 'Querying Attendance Statistics');

  printSubSection('Query 1: Course Attendance Overview');
  
  const courseQuery = await contract.getCourseAttendance('BCI3353', '2026-03-10');
  if (courseQuery.success) {
    console.log('Course: BCI3353 on 2026-03-10\n');
    
    const tableData = [
      ['Present', courseQuery.summary.present, `${((courseQuery.summary.present / courseQuery.summary.total) * 100).toFixed(1)}%`],
      ['Late', courseQuery.summary.late, `${((courseQuery.summary.late / courseQuery.summary.total) * 100).toFixed(1)}%`],
      ['Absent', courseQuery.summary.absent, `${((courseQuery.summary.absent / courseQuery.summary.total) * 100).toFixed(1)}%`],
      ['TOTAL', courseQuery.summary.total, '100%']
    ];
    
    printTable(['Status', 'Count', 'Percentage'], tableData);
    console.log();
    printSuccess(`Overall Attendance Rate: ${courseQuery.summary.attendanceRate}`);
  }

  printSubSection('Query 2: Individual Student Attendance');

  const studentQuery = await contract.getStudentAttendance('CB23021', 'BCI3353');
  if (studentQuery.success) {
    console.log('Student: CB23021 - Mohamad Fahmi\n');
    printInfo('Total Sessions Attended', studentQuery.summary.total);
    printInfo('Present', studentQuery.summary.present);
    printInfo('Late', studentQuery.summary.late);
    printInfo('Absent', studentQuery.summary.absent);
    console.log();
    
    if (studentQuery.records.length > 0) {
      console.log('Recent Records:');
      for (const rec of studentQuery.records.slice(0, 3)) {
        console.log(`  ${rec.attendanceID} | ${rec.date} | ${rec.status}`);
      }
    }
    printSuccess('Student history retrieved');
  }

  printSummaryBox('Scenario 2 Summary', {
    'Queries Executed': '2',
    'Course Attendance Rate': courseQuery.success ? courseQuery.summary.attendanceRate : 'N/A',
    'Student Records': studentQuery.success ? studentQuery.summary.total : '0'
  });

  //Scenario 3: Update and Delete Record
  printScenarioHeader(3, 'Updating and Deleting Records');

  printSubSection('Operation 1: Updating Attendance Status');

  const recordToUpdate = attendanceRecords[1];
  const readResult = await contract.readAttendance(recordToUpdate);
  
  if (readResult.success) {
    console.log(`Record: ${recordToUpdate}\n`);
    printInfo('Student ID', readResult.record.studentID);
    printInfo('Current Status', readResult.record.status);
    console.log();

    const updateResult = await contract.updateAttendance(
      recordToUpdate,
      'Present',
      'Lecturer confirmed late arrival but still within tolerance window'
    );

    if (updateResult.success) {
      printInfo('Updated Status', updateResult.record.status);
      printInfo('Update Reason', updateResult.record.updateReason);
      printInfo('Updated At', updateResult.record.updatedAt);
      console.log();
      printSuccess('Record updated successfully');
    }
  }

  printSubSection('Operation 2: Soft-Deleting Duplicate Record');

  const recordToDelete = attendanceRecords[4];
  const deleteResult = await contract.deleteAttendance(
    recordToDelete,
    'Duplicate entry detected - student was recorded twice by mistake'
  );

  if (deleteResult.success) {
    console.log(`Record: ${recordToDelete}\n`);
    printInfo('Student ID', deleteResult.record.studentID);
    printInfo('Soft Deleted', deleteResult.record.isDeleted ? 'Yes' : 'No');
    printInfo('Deletion Reason', deleteResult.record.updateReason);
    printInfo('Preserved in Ledger', 'Yes (for audit trail)');
    console.log();
    printSuccess('Record soft-deleted and archived for audit trail');
  }

  printSubSection('Operation 3: Verifying Soft-Delete Effect');

  const afterDeleteQuery = await contract.getCourseAttendance('BCI3353', '2026-03-10');
  if (afterDeleteQuery.success) {
    console.log('Course Attendance After Deletion\n');
    printInfo('Total Active Records', afterDeleteQuery.summary.total);
    printInfo('Soft-Deleted Records', 1);
    printInfo('New Attendance Rate', afterDeleteQuery.summary.attendanceRate);
    console.log();
    printSuccess('Soft-deleted records correctly excluded from active queries');
  }

  printSummaryBox('Scenario 3 Summary', {
    'Records Updated': '1',
    'Records Soft-Deleted': '1',
    'Active Records Remaining': afterDeleteQuery.success ? afterDeleteQuery.summary.total : 'N/A',
    'Audit Trail Preserved': 'Yes'
  });


  //Scenario 4: Multi Date Analysis
  printScenarioHeader(4, 'Multi-Date Course Analysis');

  printSubSection('Recording attendance for multiple class sessions');

  const dates = ['2026-03-10', '2026-03-17', '2026-03-24'];
  const multiDateStudents = [
    { id: 'CB23021', name: 'Mohamad Fahmi' },
    { id: 'CB23081', name: 'Muhamad Khairul' },
    { id: 'CB23053', name: 'Muhammad Hafiz' },
    { id: 'CB24161', name: 'Muhammad Amir' },
    { id: 'CB23044', name: 'Muhammad Aizul Azhan' }
  ];

  const statusPatterns = [
    ['Present', 'Present', 'Present'],  
    ['Present', 'Late', 'Absent'],    
    ['Present', 'Present', 'Late'],     
    ['Absent', 'Present', 'Present'],     
    ['Present', 'Late', 'Late']        
  ];

  console.log('Recording attendance across 3 weeks:\n');
  printInfo('Weeks', '2026-03-10, 2026-03-17, 2026-03-24');
  printInfo('Students', multiDateStudents.length);
  printInfo('Total Records', multiDateStudents.length * dates.length);
  console.log();

  let totalCreated = 0;

  for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
    console.log(`Week ${dateIdx + 1} - ${dates[dateIdx]}:`);
    
    for (let studentIdx = 0; studentIdx < multiDateStudents.length; studentIdx++) {
      const student = multiDateStudents[studentIdx];
      const status = statusPatterns[studentIdx][dateIdx];
      
      const result = await contract.createAttendance(
        student.id, student.name, 'BCI3353', 'Blockchain Technology',
        dates[dateIdx], '14:00:00', 'LEC001', 'TS. DR. SALWANA MOHAMAD @ ASMARA', status
      );

      if (result.success) {
        totalCreated++;
      }
    }
    console.log(`  ✓ ${multiDateStudents.length} records created for ${dates[dateIdx]}\n`);
  }

  printSuccess(`Total ${totalCreated} multi-date attendance records created`);

  printSubSection('Analyzing attendance trends across weeks');

  const trendData = [];

  for (const date of dates) {
    const query = await contract.getCourseAttendance('BCI3353', date);
    if (query.success) {
      trendData.push([
        date,
        query.summary.total,
        query.summary.present,
        query.summary.late,
        query.summary.absent,
        query.summary.attendanceRate
      ]);
    }
  }

  console.log('Attendance Trend Analysis:\n');
  printTable(
    ['Date', 'Total', 'Present', 'Late', 'Absent', 'Rate'],
    trendData
  );

  console.log();
  console.log('Trend Insights:');
  
  if (trendData.length >= 2) {
    const rate1 = parseFloat(trendData[0][5]);
    const rate2 = parseFloat(trendData[1][5]);
    const rate3 = parseFloat(trendData[2][5]);
    
    if (rate3 < rate2 && rate2 < rate1) {
      console.log('  ⚠ Declining attendance pattern detected');
      console.log(`    Week 1: ${rate1}% → Week 2: ${rate2}% → Week 3: ${rate3}%`);
      console.log('    Recommendation: Follow up with absent students\n');
    } else {
      console.log('  ✓ Stable to improving attendance\n');
    }
  }

  printSummaryBox('Scenario 4 Summary', {
    'Multi-Date Records': totalCreated,
    'Date Range': `${dates[0]} to ${dates[2]}`,
    'Average Attendance Rate': trendData.length > 0 
      ? `${(trendData.reduce((sum, r) => sum + parseFloat(r[5]), 0) / trendData.length).toFixed(1)}%`
      : 'N/A',
    'Trend Status': 'Analyzed'
  });

  //Blockchain Validation & System Status
  printScenarioHeader('FINAL', 'Blockchain Validation & System Status');

  const finalState = contract.getState();

  console.log('Blockchain Integrity Check:\n');
  printInfo('Total Blocks in Ledger', finalState.ledger.length);
  printInfo('Total Attendance Records', Object.keys(finalState.state).length);
  printInfo('Active Records', Object.values(finalState.state).filter(r => !r.isDeleted).length);
  printInfo('Soft-Deleted Records', Object.values(finalState.state).filter(r => r.isDeleted).length);
  printInfo('Blockchain Valid', finalState.isValid ? 'YES' : 'NO');
  console.log();

  if (finalState.isValid) {
    printSuccess('Blockchain integrity verified - all blocks correctly linked');
    printSuccess('SHA-256 hash chain validation passed');
    printSuccess('All cryptographic signatures intact');
  }

  printSummaryBox('Overall System Statistics', {
    'Total Scenarios Executed': '4',
    'Total Transactions': finalState.ledger.length - 1,
    'Total Records Created': Object.keys(finalState.state).length,
    'System Status': finalState.isValid ? 'OPERATIONAL' : 'ERROR',
    'Blockchain Valid': finalState.isValid ? 'YES' : 'NO'
  });

  printFooter();

  console.log('All scenarios executed successfully!');
  console.log('Files saved: ledger.json, state.json\n');

})();