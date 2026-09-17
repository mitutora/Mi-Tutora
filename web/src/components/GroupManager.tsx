import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Users, User, Plus, X, Info, CheckSquare, Square, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  id: string;
  name: string;
  category?: string;
  groupDocId?: string;
  [key: string]: any;
}

interface GroupManagerProps {
  students: Student[];
  onSave: (updatedStudents: Student[]) => void;
  onCancel?: () => void;
  isModal?: boolean;
  title?: string;
  subtitle?: string;
}

interface GroupState {
  [key: string]: Student[];
}

export default function GroupManager({ students, onSave, onCancel, isModal = false, title = "Group Your Students", subtitle = "Organize your students into groups. Teachers will send a single offer covering all students in a group." }: GroupManagerProps) {
  const [groups, setGroups] = useState<GroupState>({ unassigned: [] });
  const [groupNames, setGroupNames] = useState<{ [key: string]: string }>({});
  const [selectionMode, setSelectionMode] = useState<string | null>(null); // groupId that is currently in 'choose' mode
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const resetGroups = async (isManual = false) => {
    const initialGroups: GroupState = { unassigned: [] };
    const names: { [key: string]: string } = {};
    
    let groupCounter = 1;

    students.forEach(student => {
      if (student.groupDocId && student.groupDocId !== 'unassigned') {
        if (!initialGroups[student.groupDocId]) {
          initialGroups[student.groupDocId] = [];
          names[student.groupDocId] = `Group ${groupCounter++}`;
        }
        initialGroups[student.groupDocId].push(student);
      } else {
        initialGroups['unassigned'].push(student);
      }
    });

    if (Object.keys(initialGroups).length === 1 && initialGroups['unassigned'].length > 0) {
      const { db } = await import('@/utils/firebase/client');
      const { collection, doc } = await import('firebase/firestore');
      const defaultGroupId = doc(collection(db, 'groups')).id;
      initialGroups[defaultGroupId] = [];
      names[defaultGroupId] = 'Group 1';
    }

    setGroups(initialGroups);
    setGroupNames(names);
    setSelectionMode(null);
    setSelectedStudents([]);
    
    if (isManual) {
        toast.info("Changes undone!", { description: "Groups have been reverted to their original state." });
    }
  };

  useEffect(() => {
    resetGroups();
  }, [students]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }
    
    const sourceList = Array.from(groups[source.droppableId]);
    const destList = Array.from(groups[destination.droppableId]);
    
    const [movedItem] = sourceList.splice(source.index, 1);
    
    if (source.droppableId !== destination.droppableId && destination.droppableId !== 'unassigned') {
      const destCategory = destList.length > 0 ? destList[0].category : null;
      if (destCategory && movedItem.category && destCategory !== movedItem.category) {
        toast.error("Category Mismatch", { description: "Students with different categories cannot be placed in the same group." });
        return;
      }
    }
    
    if (source.droppableId === destination.droppableId) {
      sourceList.splice(destination.index, 0, movedItem);
      setGroups({
        ...groups,
        [source.droppableId]: sourceList
      });
    } else {
      destList.splice(destination.index, 0, movedItem);
      setGroups({
        ...groups,
        [source.droppableId]: sourceList,
        [destination.droppableId]: destList
      });
    }
  };

  const addGroup = async () => {
    const { db } = await import('@/utils/firebase/client');
    const { collection, doc } = await import('firebase/firestore');
    const newGroupId = doc(collection(db, 'groups')).id;
    setGroups({ ...groups, [newGroupId]: [] });
    setGroupNames({ ...groupNames, [newGroupId]: `Group ${Object.keys(groups).length}` });
  };

  const removeGroup = (groupId: string) => {
    if (groupId === 'unassigned') return;
    
    const studentsToMove = groups[groupId];
    const newGroups = { ...groups };
    delete newGroups[groupId];
    
    newGroups['unassigned'] = [...newGroups['unassigned'], ...studentsToMove];
    setGroups(newGroups);
    
    const newNames = { ...groupNames };
    delete newNames[groupId];
    setGroupNames(newNames);
  };

  const toggleSelectionMode = (groupId: string) => {
    if (selectionMode === groupId) {
      setSelectionMode(null);
      setSelectedStudents([]);
    } else {
      setSelectionMode(groupId);
      // Pre-select students already in this group
      setSelectedStudents(groups[groupId].map(s => s.id));
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      const student = Object.values(groups).flat().find(s => s.id === studentId);
      if (student && selectionMode && selectionMode !== 'unassigned') {
        const firstSelected = selectedStudents.length > 0 
          ? Object.values(groups).flat().find(s => s.id === selectedStudents[0]) 
          : null;
          
        if (firstSelected && firstSelected.category && student.category && firstSelected.category !== student.category) {
          toast.error("Category Mismatch", { description: "You cannot mix students of different categories." });
          return;
        }
      }
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const applySelection = () => {
    if (!selectionMode) return;
    
    const newGroups = { ...groups };
    const allStudents = Object.values(groups).flat();
    
    // Reset the target group
    newGroups[selectionMode] = [];
    
    // Remove selected students from other groups and add to target
    Object.keys(newGroups).forEach(key => {
      if (key !== selectionMode) {
        newGroups[key] = newGroups[key].filter(s => !selectedStudents.includes(s.id));
      }
    });
    
    // Add selected students to target
    const studentsToAdd = allStudents.filter(s => selectedStudents.includes(s.id));
    newGroups[selectionMode] = studentsToAdd;
    
    setGroups(newGroups);
    setSelectionMode(null);
    setSelectedStudents([]);
  };

  const handleSave = () => {
    const updatedStudents: Student[] = [];
    
    Object.keys(groups).forEach(groupId => {
      groups[groupId].forEach(student => {
        let finalGroupId = groupId;
        // If a student is left in 'unassigned', they become their own individual group
        if (groupId === 'unassigned') {
          finalGroupId = `indv_${student.id}`;
        }
        updatedStudents.push({ ...student, groupDocId: finalGroupId });
      });
    });
    
    toast.success("Groups saved successfully!", { description: "Your students have been organized." });
    onSave(updatedStudents);
  };

  return (
    <div className={`flex flex-col h-full ${!isModal ? 'bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden' : ''}`}>
      {!isModal && (
        <div className="bg-[#00a992] p-4 sm:p-6 text-white">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
            <Users className="w-6 h-6" /> {title}
          </h2>
          <p className="text-emerald-100 font-medium text-sm">
            {subtitle}
          </p>
        </div>
      )}

      <div className="p-4 sm:p-6 bg-emerald-50/50 border-b border-gray-100 flex items-start gap-3">
        <div className="mt-0.5 text-emerald-600 bg-emerald-100 p-1.5 rounded-lg">
          <Info className="w-5 h-5" />
        </div>
        <div className="text-sm text-gray-700 font-medium leading-relaxed">
          <strong>Why group students?</strong> If you want the same teacher for multiple students, drag them into the same group. If you are looking for different teachers for different students, please assign them to separate groups. 
          <br/><span className="text-gray-500 mt-1 block">Unassigned students will automatically be treated as individuals.</span>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex-grow overflow-y-auto bg-gray-50/30">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Unassigned Pool */}
            <Droppable droppableId="unassigned">
              {(provided, snapshot) => (
                <div 
                  ref={provided.innerRef} 
                  {...provided.droppableProps}
                  className={`bg-white rounded-2xl border-2 p-4 min-h-[250px] flex flex-col transition-all ${
                    snapshot.isDraggingOver ? 'border-[#00a992] bg-emerald-50/30 shadow-md' : 'border-dashed border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-500 flex items-center gap-2">
                      <User className="w-4 h-4" /> Unassigned Pool
                    </h3>
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                      {groups['unassigned']?.length || 0}
                    </span>
                  </div>
                  
                  <div className="flex-grow flex flex-col gap-3">
                    {groups['unassigned']?.map((student, index) => (
                      <Draggable key={student.id} draggableId={student.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style as React.CSSProperties}
                            className={`p-3 rounded-xl border bg-white flex items-center gap-3 transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg border-[#00a992] z-50' : 'shadow-sm border-gray-100 hover:border-[#00a992]/50'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-xs flex-shrink-0">
                              {student.name.charAt(0)}
                            </div>
                            <div className="flex-grow overflow-hidden">
                              <p className="font-bold text-sm text-gray-900 truncate">{student.name}</p>
                              <p className="text-xs text-gray-500 truncate capitalize">{student.category || 'Student'}</p>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {(!groups['unassigned'] || groups['unassigned'].length === 0) && !snapshot.isDraggingOver && (
                      <div className="flex-grow flex items-center justify-center text-center p-4 text-gray-400 text-sm font-medium border-2 border-dashed border-transparent rounded-xl">
                        All students are grouped!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Droppable>

            {/* Group Buckets */}
            {Object.keys(groups).filter(k => k !== 'unassigned').map((groupId) => (
              <Droppable key={groupId} droppableId={groupId}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    className={`bg-white rounded-2xl border-2 p-4 min-h-[250px] flex flex-col transition-all ${
                      selectionMode === groupId ? 'border-[#00a992] ring-4 ring-emerald-50' :
                      snapshot.isDraggingOver ? 'border-[#00a992] bg-emerald-50/30 shadow-md' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#00a992]" />
                        <h3 className="font-bold text-gray-900">{groupNames[groupId]}</h3>
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full ml-1">
                          {groups[groupId].length}
                        </span>
                      </div>
                      <button 
                        onClick={() => removeGroup(groupId)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                        title="Remove Group"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {selectionMode === groupId ? (
                      <div className="flex-grow flex flex-col gap-2">
                        <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Select Students</div>
                        {Object.values(groups).flat().map(student => (
                          <div 
                            key={student.id} 
                            onClick={() => toggleStudentSelection(student.id)}
                            className={`p-2 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${
                              selectedStudents.includes(student.id) ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:bg-gray-50'
                            }`}
                          >
                            {selectedStudents.includes(student.id) ? (
                              <CheckSquare className="w-4 h-4 text-[#00a992]" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-300" />
                            )}
                            <span className="font-bold text-sm text-gray-700">{student.name}</span>
                          </div>
                        ))}
                        <div className="mt-auto pt-4 flex gap-2">
                          <button onClick={() => setSelectionMode(null)} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                          <button onClick={applySelection} className="flex-1 py-2 text-xs font-bold text-white bg-[#00a992] rounded-lg hover:bg-emerald-600">Apply</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-grow flex flex-col gap-3">
                          {groups[groupId].map((student, index) => (
                            <Draggable key={student.id} draggableId={student.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={provided.draggableProps.style as React.CSSProperties}
                                  className={`p-3 rounded-xl border bg-white flex items-center gap-3 transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg border-[#00a992] z-50' : 'shadow-sm border-gray-100 hover:border-[#00a992]/50'
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center font-bold text-[#00a992] text-xs flex-shrink-0">
                                    {student.name.charAt(0)}
                                  </div>
                                  <div className="flex-grow overflow-hidden">
                                    <p className="font-bold text-sm text-gray-900 truncate">{student.name}</p>
                                    <p className="text-xs text-gray-500 truncate capitalize">{student.category || 'Student'}</p>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {groups[groupId].length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex-grow flex flex-col items-center justify-center text-center p-4 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                              <p className="font-medium mb-1">Empty Group</p>
                              <p className="text-xs opacity-75">Drag students here</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <button 
                            onClick={() => toggleSelectionMode(groupId)}
                            className="w-full py-2 text-xs font-bold text-[#00a992] bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            Click to Choose Students
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Droppable>
            ))}

            {/* Add Group Button */}
            <div className="min-h-[250px] flex items-center justify-center">
              <button 
                onClick={addGroup}
                className="flex flex-col items-center justify-center gap-3 w-full h-full border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:text-[#00a992] hover:border-[#00a992] hover:bg-emerald-50/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm">Create New Group</span>
              </button>
            </div>

          </div>
        </DragDropContext>
      </div>
      
      <div className="p-4 sm:p-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
        {onCancel && (
          <button 
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-center"
          >
            Cancel
          </button>
        )}
        <button 
          onClick={() => resetGroups(true)}
          className="w-full sm:w-auto px-6 py-3 font-bold text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" /> Undo Changes
        </button>
        <button 
          onClick={handleSave}
          className="w-full sm:w-auto px-8 py-3 font-bold text-white bg-[#00a992] rounded-xl shadow-md hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" /> Save Groups
        </button>
      </div>
    </div>
  );
}
