"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "cn"
import { CaretDown, CaretUp, CaretUpDown, Check } from "@phosphor-icons/react"

function Select<
  Value,
  Multiple extends boolean | undefined = undefined,
>(props: SelectPrimitive.Root.Props<Value, Multiple>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        "mb-1 cursor-default text-xs font-medium text-foreground/70 select-none",
        className
      )}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground whitespace-nowrap select-none",
        "hover:bg-accent hover:text-accent-foreground",
        "data-pressed:bg-accent data-pressed:text-accent-foreground",
        "focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="ml-auto shrink-0 text-muted-foreground">
        <CaretUpDown />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("truncate data-placeholder:text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectPortal({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Portal>) {
  return <SelectPrimitive.Portal data-slot="select-portal" {...props} />
}

function SelectBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Backdrop>) {
  return (
    <SelectPrimitive.Backdrop
      data-slot="select-backdrop"
      className={cn("pointer-events-none", className)}
      {...props}
    />
  )
}

function SelectPositioner({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Positioner>) {
  return (
    <SelectPrimitive.Positioner
      data-slot="select-positioner"
      className={cn("z-50", className)}
      {...props}
    />
  )
}

function SelectPopup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup>) {
  return (
    <SelectPrimitive.Popup
      data-slot="select-popup"
      className={cn(
        "my-2 max-h-(--available-height) min-w-[var(--anchor-width)] origin-(--transform-origin) overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg",
        "data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:opacity-0",
        "data-[side=none]:data-starting-style:scale-100 data-[side=none]:data-ending-style:scale-100",
        className
      )}
      {...props}
    />
  )
}

function SelectList({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.List>) {
  return (
    <SelectPrimitive.List
      data-slot="select-list"
      className={cn(
        "relative max-h-(--available-height) overflow-y-auto py-1 scroll-py-6",
        className
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "grid cursor-default grid-cols-[1rem_1fr] items-center gap-2.5 rounded-sm py-1.5 pr-3 pl-2.5 text-sm outline-hidden select-none",
        "[@media(hover:hover)]:data-highlighted:bg-accent [@media(hover:hover)]:data-highlighted:text-accent-foreground",
        "focus-visible:bg-accent focus-visible:text-accent-foreground",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </SelectPrimitive.Item>
  )
}

function SelectItemIndicator({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ItemIndicator>) {
  return (
    <SelectPrimitive.ItemIndicator
      data-slot="select-item-indicator"
      className={cn("col-start-1 flex items-center justify-center", className)}
      {...props}
    >
      {children ?? <Check className="size-4 shrink-0" />}
    </SelectPrimitive.ItemIndicator>
  )
}

function SelectItemText({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ItemText>) {
  return (
    <SelectPrimitive.ItemText
      data-slot="select-item-text"
      className={cn("col-start-2 truncate", className)}
      {...props}
    />
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("px-1 py-1", className)}
      {...props}
    />
  )
}

function SelectGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-group-label"
      className={cn(
        "py-1.5 px-3 text-xs font-medium text-muted-foreground select-none",
        className
      )}
      {...props}
    />
  )
}

function SelectScrollUpArrow({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-arrow"
      className={cn(
        "text-muted-foreground [&>svg] mx-auto flex w-full items-center justify-center py-1 [&_svg]:size-3",
        className
      )}
      {...props}
    >
      <CaretUp />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownArrow({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-arrow"
      className={cn(
        "text-muted-foreground [&>svg] mx-auto flex w-full items-center justify-center py-1 [&_svg]:size-3",
        className
      )}
      {...props}
    >
      <CaretDown />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectBackdrop,
  SelectPositioner,
  SelectPopup,
  SelectList,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectSeparator,
  SelectGroup,
  SelectGroupLabel,
  SelectScrollUpArrow,
  SelectScrollDownArrow,
}