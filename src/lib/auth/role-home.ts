export function roleHome(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "VENDOR":
      return "/vendor";
    case "RIDER":
      return "/rider";
    default:
      return "/account";
  }
}
