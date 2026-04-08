declare module 'qrcode' {
  function toDataURL(text: string, options?: any): Promise<string>;
  const QRCode: {
    toDataURL: typeof toDataURL;
    [key: string]: any;
  };
  export default QRCode;
  export { toDataURL };
}
