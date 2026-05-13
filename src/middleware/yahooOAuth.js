"use strict";

/**
 * Direct Yahoo OAuth 2.0 helpers.
 *
 * Replaces the legacy Yahoo OAuth strategy with standard RFC 6749 requests through axios.
 * Do not log authorization codes, refresh tokens, or access tokens.
 */

const axios = require("axios");
const config = require("../config");

const AUTH_URL = "https://api.login.yahoo.com/oauth2/request_auth";
const TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token";

function basicAuthHeader() {
  return `Basic ${Buffer
    .from(`${config.yahoo.clientId}:${config.yahoo.clientSecret}`)
    .toString("base64")}`;
}

function yahooOAuthError(error, action) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const yahooMessage = data?.error_description
    || data?.error
    || data?.message
    || (typeof data === "string" ? data : null)
    || error.message;
  const message = status
    ? `Yahoo OAuth ${action} failed (${status}): ${yahooMessage}`
    : `Yahoo OAuth ${action} failed: ${yahooMessage}`;
  return Object.assign(new Error(message), {
    status,
    yahoo_error: data,
  });
}

function getYahooAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: config.yahoo.clientId,
    redirect_uri: config.yahoo.redirectUri,
    response_type: "code",
    scope: "openid fspt-r",
    state,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

async function requestToken(body, action) {
  try {
    const { data } = await axios.post(TOKEN_URL, new URLSearchParams(body).toString(), {
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return data;
  } catch (error) {
    throw yahooOAuthError(error, action);
  }
}

async function exchangeYahooCode(code) {
  return requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.yahoo.redirectUri,
  }, "code exchange");
}

async function refreshYahooToken(refreshToken) {
  return requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }, "token refresh");
}

module.exports = {
  getYahooAuthUrl,
  exchangeYahooCode,
  refreshYahooToken,
};
