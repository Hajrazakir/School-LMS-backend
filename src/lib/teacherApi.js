import api from './api';

export const fetchTeachers = async () => {
  const res = await api.get('/admin/teachers');
  return res.data.data.teachers;
};

export const createTeacherApi = async (payload) => {
  const res = await api.post('/admin/teachers', payload);
  return res.data.data.teacher;
};

export const updateTeacherApi = async (id, payload) => {
  const res = await api.patch(`/admin/teachers/${id}`, payload);
  return res.data.data.teacher;
};

export const setTeacherStatusApi = async (id, isActive) => {
  await api.patch(`/admin/teachers/${id}/status`, { isActive });
};

export const deleteTeacherApi = async (id) => {
  await api.delete(`/admin/teachers/${id}`);
};