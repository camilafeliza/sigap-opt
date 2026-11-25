job "sigap-opt" {
  datacenters = ["ntmy-sota"]
  type        = "service"

  constraint {
    attribute = "${node.class}"
    operator  = "="
    value     = "compute"
  }

  # Utamakan node pemilik basis data utama, namun tetap siap failover
  affinity {
    attribute = "${node.unique.name}"
    operator  = "="
    value     = "kavdhnos-server"
    weight    = 100
  }

  update {
    max_parallel      = 1
    min_healthy_time  = "10s"
    healthy_deadline  = "3m"
    progress_deadline = "5m"
    auto_revert       = true
  }

  group "web" {
    count          = 1
    shutdown_delay = "5s"

    network {
      port "http" { to = 8080 }
    }

    service {
      name     = "sigap-opt"
      port     = "http"
      provider = "nomad"
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.sigap-opt.rule=Host(`sigap.raxbyte.com`)",
        "traefik.http.routers.sigap-opt.entrypoints=websecure",
        "traefik.http.routers.sigap-opt.tls=true",
        "traefik.http.services.sigap-opt.loadbalancer.server.scheme=http"
      ]
      check {
        type     = "http"
        path     = "/api/health"
        interval = "10s"
        timeout  = "2s"
      }
    }

    task "posix-engine-so" {
      driver = "podman"

      vault {
        role = "sigap-opt"
      }

      config {
        image = "localhost/posix-engine-so:latest"
        ports = ["http"]
        volumes = [
          "/opt/ntmy-persistent/.posix-engine-op/data:/app/data"
        ]
      }

      env {
        PORT         = "8080"
        APP_HOST     = "0.0.0.0"
        DATABASE_URL = "file:/app/data/sigap_opt.db"
        GEMINI_MODEL = "gemini-3.5-flash-lite"
      }

      template {
        data = <<EOT
{{ with secret "ntmy-erp/data/sigap-opt" }}
GEMINI_API_KEY="{{ .Data.data.GEMINI_API_KEY }}"
JWT_SECRET="{{ .Data.data.JWT_SECRET }}"
{{ end }}
EOT
        destination = "secrets/env.vars"
        env         = true
      }

      resources {
        cpu    = 200
        memory = 128
      }
    }
  }
}
