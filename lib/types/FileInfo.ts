import { CurlFileType } from '../enum/CurlFileType'

export type FileInfo = {
  fileType: CurlFileType
  time: Date
  perm: number
  uid: number
  gid: number
  size: number
  hardLinks: number
  strings: {
    time: string
    perm: string
    user: string
    group: string
    target: string | null
  }
}
