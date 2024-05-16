// using this for CurrentUser() req.user data type
// instead of User entity
export class CurrentUserDto {
  companyId: number
  companyFeatureIds: number[];
  companyName: string
  companyLogo: string
  subdomain: string
  customerModule: boolean
  customerSubdomain: string
  isTrial: boolean
  userId: number
  fullName: string
  email: string
  phoneCode: string
  phoneNumber: string
  affiliation: string
  role: string
  userStatus: string
  status: number
  subtotalQuotation: boolean
}
