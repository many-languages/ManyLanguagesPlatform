export const generateJatosRunUrl = (code: string) =>
  `${process.env.NEXT_PUBLIC_JATOS_BASE!}/publix/${code}`
