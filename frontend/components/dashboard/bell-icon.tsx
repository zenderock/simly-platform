import { IconBell, IconBellRinging } from "@tabler/icons-react";

export default function BellIcon({isActive}: {isActive: boolean}) {
    return (
        <>
        {
            isActive ? (
                <IconBellRinging className="size-6" />
            ) : (
                <IconBell className="size-6" />
            )
        }
        </>
    )
}