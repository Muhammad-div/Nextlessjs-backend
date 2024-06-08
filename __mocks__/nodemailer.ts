export const mockSendMail = jest.fn();

export default {
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: mockSendMail,
  })),
};
