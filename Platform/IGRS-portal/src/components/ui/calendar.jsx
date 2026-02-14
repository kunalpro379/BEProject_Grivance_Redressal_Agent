import * as React from "react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"

const Calendar = ({
  mode,
  selected,
  onSelect,
  className,
  showOutsideDays = true,
  ...props
}) => {
  return (
    <DayPicker
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      showOutsideDays={showOutsideDays}
      className={`p-3 ${className}`}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-gray-900 dark:text-gray-100",
        nav: "space-x-1 flex items-center",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary-50 dark:[&:has([aria-selected])]:bg-primary-900/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        day_selected: "bg-primary-600 dark:bg-primary-500 text-white hover:bg-primary-600 hover:text-white focus:bg-primary-600 focus:text-white",
        day_today: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        day_outside: "text-gray-400 dark:text-gray-500 opacity-50",
        day_disabled: "text-gray-400 dark:text-gray-500 opacity-50",
        day_range_middle: "aria-selected:bg-primary-50 aria-selected:text-primary-900",
        day_hidden: "invisible",
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
