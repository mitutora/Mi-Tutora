export const getStudentDemoFee = (student: any, pricingData: any[]) => {
  if (!student || !pricingData) return { price: 100, name: 'General Tuition' };
  
  let targetId = 'general';
  const cat = student.category || '';
  
  if (cat === 'school') {
    const cl = (student.classLevel || '').toLowerCase();
    if (cl.includes('lkg')) targetId = 'school_lkg';
    else if (cl.includes('ukg')) targetId = 'school_ukg';
    else if (cl.includes('1st pu') || cl.includes('1st puc') || cl.includes('11th') || cl.includes('class 11')) targetId = 'school_class_11';
    else if (cl.includes('2nd pu') || cl.includes('2nd puc') || cl.includes('12th') || cl.includes('class 12')) targetId = 'school_class_12';
    else {
      const match = cl.match(/\d+/);
      if (match) targetId = `school_class_${match[0]}`;
    }
  } else if (cat === 'competitive') {
    const goal = (student.learningGoal || student.board || '').toLowerCase();
    if (goal.includes('neet')) targetId = 'competitive_neet';
    else if (goal.includes('jee')) targetId = 'competitive_jee';
    else if (goal.includes('ssc')) targetId = 'competitive_ssc';
    else if (goal.includes('upsc')) targetId = 'competitive_upsc';
    else if (goal.includes('cat')) targetId = 'competitive_cat';
    else if (goal.includes('gate')) targetId = 'competitive_gate';
    else if (goal.includes('bank')) targetId = 'competitive_banking';
  } else if (cat === 'programming') {
    const level = (student.programmingLevel || '').toLowerCase();
    if (level.includes('advanced')) targetId = 'programming_advanced';
    else if (level.includes('beginner')) targetId = 'programming_beginner';
    else targetId = 'programming_intermediate';
  } else if (cat === 'languages') {
    targetId = 'languages_general';
  }

  const found = pricingData.find((p: any) => p.id === targetId);
  if (found) {
    let name = found.displayName;
    name = name.replace(/School Tuition/i, 'demo fee').replace(/Preparation/i, 'demo fee').replace(/Tuition/i, 'demo fee');
    return { price: found.price, name };
  }
  return { price: 100, name: 'General demo fee' };
};

export const calculateTotalDemoFee = (studentsList: any[], pricingData: any[]) => {
  if (!studentsList || studentsList.length === 0) return 100;
  
  const demoFees = studentsList.map((s: any) => ({ 
    student: s, 
    feeData: getStudentDemoFee(s, pricingData) 
  }));
  
  const totalDemoFee = demoFees.reduce((sum: number, curr: any) => sum + curr.feeData.price, 0);
  return totalDemoFee || 100;
};
