import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
  getPaginationRowModel,
  getFacetedMinMaxValues,
  getExpandedRowModel,
} from "@tanstack/react-table"
import type { SortingState, ExpandedState, Row } from "@tanstack/react-table"
import React from "react"

import { ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline"
import Filter from "../(app)/studies/components/Filter"
import { EmptyState } from "./EmptyState"

type TableProps<TData> = {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  filters?: {} //pass object with the type of filter for a given colunm based on colunm id
  enableSorting?: boolean
  enableFilters?: boolean
  addPagination?: boolean
  classNames?: {
    table?: string
    thead?: string
    tbody?: string
    tfoot?: string
    th?: string
    td?: string
    tr?: string
    paginationButton?: string
    pageInfo?: string
    goToPageInput?: string
    pageSizeSelect?: string
  }
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode
  getRowCanExpand?: (row: Row<TData>) => boolean
  onRowClick?: (row: Row<TData>) => void
}

const Table = <TData extends unknown>({
  columns,
  data,
  classNames,
  enableSorting = true,
  enableFilters = true,
  addPagination = false,
  renderSubComponent,
  getRowCanExpand,
  onRowClick,
}: TableProps<TData>) => {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [expanded, setExpanded] = React.useState<ExpandedState>({})

  const table = useReactTable({
    data,
    columns,
    enableSorting: enableSorting,
    enableFilters: enableFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand,
    ...(addPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    state: {
      sorting: sorting,
      expanded: expanded,
    },
    onExpandedChange: setExpanded,
    initialState: {
      pagination: {
        // When pagination is disabled, set page size to show all rows
        pageSize: addPagination ? 5 : Number.MAX_SAFE_INTEGER,
      },
    },
    onSortingChange: setSorting,
    autoResetPageIndex: false,
  })

  const currentPage = table.getState().pagination.pageIndex + 1
  const pageCount = table.getPageCount()

  return (
    <>
      <table className={classNames?.table || "table"}>
        <thead className={classNames?.thead || "text-xl text-base-content"}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className={classNames?.th}>
                  {header.isPlaceholder ? null : (
                    <>
                      <div
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none flex flex-row gap-2"
                            : "flex flex-row gap-2"
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ChevronUpIcon className="w-5 h-5" />,
                          desc: <ChevronDownIcon className="w-5 h-5" />,
                        }[header.column.getIsSorted() as string] ?? null}
                        {header.column.getCanSort() && !header.column.getIsSorted() ? (
                          <ChevronUpDownIcon className="w-5 h-5" />
                        ) : null}
                      </div>
                      {header.column.getCanFilter() ? (
                        <div>
                          <Filter column={header.column} />
                        </div>
                      ) : null}
                    </>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className={classNames?.tbody || "text-lg"}>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center p-3">
                <EmptyState message="No data found" className="p-0" />
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr
                  className={`${classNames?.tr || ""} ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={classNames?.td}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && renderSubComponent && (
                  <tr>
                    <td colSpan={row.getVisibleCells().length}>{renderSubComponent({ row })}</td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
        <tfoot className={classNames?.tfoot}>
          {table.getFooterGroups().map((footerGroup) => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.footer, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </tfoot>
      </table>
      {addPagination && table.getRowModel().rows.length > 0 && pageCount > 1 && (
        <>
          {/* Pagination buttons */}
          <div className="flex items-center gap-2">
            <button
              className={`btn btn-secondary ${classNames?.paginationButton || ""}`}
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              type="button"
            >
              {"<<"}
            </button>
            <button
              className={`btn btn-secondary ${classNames?.paginationButton || ""}`}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              type="button"
            >
              {"<"}
            </button>
            <button
              className={`btn btn-secondary ${classNames?.paginationButton || ""}`}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              type="button"
            >
              {">"}
            </button>
            <button
              className={`btn btn-secondary ${classNames?.paginationButton || ""}`}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              type="button"
            >
              {">>"}
            </button>
            {/* Curent page info */}
            <span className={`flex items-center gap-1 ${classNames?.pageInfo || ""}`}>
              <div>Page</div>
              <strong>
                {currentPage} of {pageCount}
              </strong>
            </span>
            {/* Go to page input */}
            <span className={`flex items-center gap-1 ${classNames?.goToPageInput || ""}`}>
              | Go to:
              <input
                type="number"
                defaultValue={table.getState().pagination.pageIndex + 1}
                onChange={(e) => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0
                  table.setPageIndex(page)
                }}
                className="text-secondary input-secondary input-bordered border-2 bg-base-300 rounded input-sm w-20 mt-0"
                min={1}
                max={table.getPageCount()}
              />
            </span>
            {/* Select page size input */}
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value))
              }}
              className={`text-secondary input-secondary input-bordered border-2 bg-base-300 rounded input-sm leading-normal mt-0 ${
                classNames?.pageSizeSelect || ""
              }`}
            >
              {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </>
  )
}

export default Table
