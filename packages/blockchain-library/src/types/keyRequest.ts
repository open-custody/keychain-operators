export interface KeyRequest {
  status:
    | 'KEY_REQUEST_STATUS_UNSPECIFIED'
    | 'KEY_REQUEST_STATUS_PENDING'
    | 'KEY_REQUEST_STATUS_FULFILLED'
    | 'KEY_REQUEST_STATUS_REJECTED';
}