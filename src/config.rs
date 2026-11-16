use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub gemini_api_key: Option<String>,
    pub gemini_model: String,
}

impl Config {
    pub fn from_env() -> Self {
        let host = env::var("APP_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = env::var("PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(8080);
        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "file:data/sigap_opt.db".to_string());
        let jwt_secret = env::var("JWT_SECRET")
            .unwrap_or_else(|_| "sigap-opt-agronomy-secret-key-2026".to_string());
        let gemini_api_key = env::var("GEMINI_API_KEY")
            .ok()
            .filter(|k| !k.trim().is_empty() && k != "your-gemini-api-key-here");
        let gemini_model = env::var("GEMINI_MODEL")
            .unwrap_or_else(|_| "gemini-3.5-flash-lite".to_string());

        Self {
            host,
            port,
            database_url,
            jwt_secret,
            gemini_api_key,
            gemini_model,
        }
    }
}
