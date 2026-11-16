use crate::models::Claims;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn create_jwt_token(
    secret: &str,
    user_id: &str,
    username: &str,
    role: &str,
) -> Result<String, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as usize;

    // Token valid for 7 days
    let exp = now + 7 * 24 * 3600;

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| e.to_string())
}

pub fn verify_jwt_token(secret: &str, token: &str) -> Result<Claims, String> {
    let clean_token = token.trim_start_matches("Bearer ").trim();
    let token_data = decode::<Claims>(
        clean_token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| e.to_string())?;

    Ok(token_data.claims)
}
