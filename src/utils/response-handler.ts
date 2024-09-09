export const handleDataResponse = (msg: string, statusCode?: string | null) => {
  return {
    statusCode: statusCode ?? 'OK',
    msg,
  };
};
