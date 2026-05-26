interface DateFormatProps {
  date?: Date | null
  locale: string
}

export default function DateFormat({ date, locale }: DateFormatProps) {
  return (
    <>
      {" "}
      {date
        ? date.toLocaleDateString(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
        : ""}
    </>
  )
}
