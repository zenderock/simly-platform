"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import {
  IconAlertSquareRounded,
  IconSquareCheck,
  IconAlertTriangle,
  IconInfoSquareRounded,
  IconX,
} from "@tabler/icons-react";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        destructive:
          "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
        warning:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
        info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const toastIconVariants = {
  default: null,
  destructive: (
    <IconAlertSquareRounded className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
  ),
  success: (
    <IconSquareCheck className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
  ),
  warning: (
    <IconAlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
  ),
  info: (
    <IconInfoSquareRounded className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
  ),
};

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "group-[.destructive]:border-red-300 group-[.destructive]:hover:border-red-400 group-[.destructive]:hover:bg-red-100 group-[.destructive]:text-red-700 dark:group-[.destructive]:border-red-700 dark:group-[.destructive]:hover:bg-red-900 dark:group-[.destructive]:text-red-300",
      "group-[.success]:border-emerald-300 group-[.success]:hover:border-emerald-400 group-[.success]:hover:bg-emerald-100 group-[.success]:text-emerald-700 dark:group-[.success]:border-emerald-700 dark:group-[.success]:hover:bg-emerald-900 dark:group-[.success]:text-emerald-300",
      "group-[.warning]:border-amber-300 group-[.warning]:hover:border-amber-400 group-[.warning]:hover:bg-amber-100 group-[.warning]:text-amber-700 dark:group-[.warning]:border-amber-700 dark:group-[.warning]:hover:bg-amber-900 dark:group-[.warning]:text-amber-300",
      "group-[.info]:border-blue-300 group-[.info]:hover:border-blue-400 group-[.info]:hover:bg-blue-100 group-[.info]:text-blue-700 dark:group-[.info]:border-blue-700 dark:group-[.info]:hover:bg-blue-900 dark:group-[.info]:text-blue-300",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring group-hover:opacity-100",
      "group-[.destructive]:text-red-500 group-[.destructive]:hover:text-red-700 dark:group-[.destructive]:text-red-400 dark:group-[.destructive]:hover:text-red-200",
      "group-[.success]:text-emerald-500 group-[.success]:hover:text-emerald-700 dark:group-[.success]:text-emerald-400 dark:group-[.success]:hover:text-emerald-200",
      "group-[.warning]:text-amber-500 group-[.warning]:hover:text-amber-700 dark:group-[.warning]:text-amber-400 dark:group-[.warning]:hover:text-amber-200",
      "group-[.info]:text-blue-500 group-[.info]:hover:text-blue-700 dark:group-[.info]:text-blue-400 dark:group-[.info]:hover:text-blue-200",
      className
    )}
    toast-close=""
    {...props}
  >
    <IconX className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-tight", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-80 leading-snug", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  toastIconVariants,
};
