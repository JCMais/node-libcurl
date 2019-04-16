// https://github.com/curl/curl/blob/c4e0be44089/include/curl/curl.h#L2630
export const enum CurlGlobalInit {
  Nothing = 0,
  /* no purpose since 7.57.0 */
  Ssl = 1 << 0,
  Win32 = 1 << 1,
  All = Ssl | Win32,
  Default = All,
  AckEintr = 1 << 2,
}
