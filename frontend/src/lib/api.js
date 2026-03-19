import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/api";

// Machines API
export const getMachines = async (category = null, availableOnly = false) => {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (availableOnly) params.append("available_only", "true");
  
  const response = await axios.get(`${API_URL}/machines?${params.toString()}`);
  return response.data;
};

export const getMachine = async (id) => {
  const response = await axios.get(`${API_URL}/machines/${id}`);
  return response.data;
};

export const createMachine = async (machineData) => {
  const response = await axios.post(`${API_URL}/machines`, machineData);
  return response.data;
};

export const updateMachine = async (id, machineData) => {
  const response = await axios.put(`${API_URL}/machines/${id}`, machineData);
  return response.data;
};

// Agreements API
export const getAgreements = async (status = null) => {
  const params = status ? `?status=${status}` : "";
  const response = await axios.get(`${API_URL}/agreements${params}`);
  return response.data;
};

export const getAgreement = async (id) => {
  const response = await axios.get(`${API_URL}/agreements/${id}`);
  return response.data;
};

export const createAgreement = async (agreementData) => {
  const response = await axios.post(`${API_URL}/agreements`, agreementData);
  return response.data;
};

export const updateChecklist = async (agreementId, checklist) => {
  const response = await axios.put(`${API_URL}/agreements/${agreementId}/checklist`, checklist);
  return response.data;
};

export const uploadPhoto = async (agreementId, position, file) => {
  const formData = new FormData();
  formData.append("position", position);
  formData.append("file", file);
  
  const response = await axios.post(`${API_URL}/agreements/${agreementId}/photos`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const signAgreement = async (agreementId, signatureType, signatureData) => {
  const formData = new FormData();
  formData.append("signature_type", signatureType);
  formData.append("signature_data", signatureData);
  
  const response = await axios.post(`${API_URL}/agreements/${agreementId}/sign`, formData);
  return response.data;
};

export const getPhotoUrl = (filename) => {
  return `${API_URL}/photos/${filename}`;
};

export const getSignatureUrl = (filename) => {
  return `${API_URL}/signatures/${filename}`;
};

// Inquiries API
export const createInquiry = async (inquiryData) => {
  const response = await axios.post(`${API_URL}/inquiries`, inquiryData);
  return response.data;
};

export const getInquiries = async (status = null) => {
  const params = status ? `?status=${status}` : "";
  const response = await axios.get(`${API_URL}/inquiries${params}`);
  return response.data;
};

export const updateInquiryStatus = async (inquiryId, status) => {
  const response = await axios.put(`${API_URL}/inquiries/${inquiryId}/status?status=${status}`);
  return response.data;
};

// Terms & Conditions API
export const getTerms = async () => {
  const response = await axios.get(`${API_URL}/terms`);
  return response.data;
};

export const createTerms = async (termsData) => {
  const response = await axios.post(`${API_URL}/terms`, termsData);
  return response.data;
};

export const updateTerms = async (termsId, termsData) => {
  const response = await axios.put(`${API_URL}/terms/${termsId}`, termsData);
  return response.data;
};

export const deleteTerms = async (termsId) => {
  const response = await axios.delete(`${API_URL}/terms/${termsId}`);
  return response.data;
};

// Users API (Admin)
export const getUsers = async (role = null) => {
  const params = role ? `?role=${role}` : "";
  const response = await axios.get(`${API_URL}/users${params}`);
  return response.data;
};

export const updateUserRole = async (userId, role) => {
  const response = await axios.put(`${API_URL}/users/${userId}/role?role=${role}`);
  return response.data;
};

// Seed Data
export const seedData = async () => {
  const response = await axios.post(`${API_URL}/seed`);
  return response.data;
};

// Quotes API (Staff)
export const createQuote = async (quoteData) => {
  const response = await axios.post(`${API_URL}/quotes`, quoteData);
  return response.data;
};

export const getQuotes = async (status = null) => {
  const params = status ? `?status=${status}` : "";
  const response = await axios.get(`${API_URL}/quotes${params}`);
  return response.data;
};

export const getQuote = async (quoteId) => {
  const response = await axios.get(`${API_URL}/quotes/${quoteId}`);
  return response.data;
};

export const sendQuote = async (quoteId) => {
  const response = await axios.post(`${API_URL}/quotes/${quoteId}/send`);
  return response.data;
};

// Customer Quote Access (No Auth)
export const getCustomerQuote = async (quoteId, token) => {
  const response = await axios.get(`${API_URL}/customer/quote/${quoteId}?token=${token}`);
  return response.data;
};

export const uploadIdDocument = async (quoteId, token, docType, file) => {
  const formData = new FormData();
  formData.append("token", token);
  formData.append("doc_type", docType);
  formData.append("file", file);
  
  const response = await axios.post(`${API_URL}/customer/quote/${quoteId}/upload-id`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const signQuote = async (quoteId, token, signatureData, agreedToTerms) => {
  const formData = new FormData();
  formData.append("token", token);
  formData.append("signature_data", signatureData);
  formData.append("agreed_to_terms", agreedToTerms);
  
  const response = await axios.post(`${API_URL}/customer/quote/${quoteId}/sign`, formData);
  return response.data;
};
