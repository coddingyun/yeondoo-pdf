import { getCookie, setCookie } from "../cookie"


export const getApi = (apiEndPoint, api) => {
    return fetch(apiEndPoint + api, {
        headers: {
            "Gauth": getCookie('access')
        }
    })
}

export const postApi = (apiEndPoint, api, payload) => {
    return fetch(apiEndPoint + api, {
        method: 'POST',
        headers : { 'Content-Type' : 'application/json',
                    'Gauth': getCookie('access') },
        body: JSON.stringify(payload)
    })
}

export const putApi = (apiEndPoint, api, payload) => {
    return fetch(apiEndPoint + api, {
        method: 'PUT',
        headers : { 'Content-Type' : 'application/json',
                    'Gauth': getCookie('access') },
        body: JSON.stringify(payload)
    })
}

export const deleteApi = (apiEndPoint, api) => {
    return fetch(apiEndPoint + api, {
        method: 'DELETE',
        headers : { 'Content-Type' : 'application/json',
                    'Gauth': getCookie('access') }
    })
}

export const refreshApi = async (apiEndPoint) => {
    return fetch(`${apiEndPoint}/api/update/token`
    , {
        headers: {
            'Refresh' : getCookie('refresh')
        }
    }
    ).then(response => {
        if (response.status === 401) {
          window.location.href = '/login'
          //notify('Login time has expired')
          throw new Error('로그아웃')
        }
        else if (response.status === 200) {
          let jwtToken = response.headers.get('Gauth')
          let refreshToken = response.headers.get('RefreshToken')

          if (jwtToken) {
              setCookie('access', jwtToken)
          }

          if (refreshToken) {
              setCookie('refresh', refreshToken)
          }
        }
      })
}
