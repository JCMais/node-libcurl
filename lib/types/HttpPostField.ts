export type HttpPostField =
  | {
      /**
       * Field name
       */
      name: string
      /**
       * Field contents
       */
      contents: string
    }
  | {
      /**
       * Field name
       */
      name: string
      /**
       * File path
       */
      file: string
      /**
       * Content-Type
       */
      type?: string
      /**
       * File name to be used when uploading
       */
      filename?: string
    }
