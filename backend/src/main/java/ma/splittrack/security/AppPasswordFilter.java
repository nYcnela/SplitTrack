package ma.splittrack.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import ma.splittrack.config.AppProperties;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class AppPasswordFilter extends OncePerRequestFilter {
    private static final String HEADER_NAME = "X-App-Password";
    private static final List<String> PUBLIC_PATH_PREFIXES = List.of(
        "/api/health",
        "/swagger-ui",
        "/swagger-ui.html",
        "/v3/api-docs"
    );

    private final AppProperties appProperties;

    public AppPasswordFilter(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        if ("/error".equals(path)) {
            return true;
        }
        return PUBLIC_PATH_PREFIXES.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        String provided = request.getHeader(HEADER_NAME);
        if (provided == null || !provided.equals(appProperties.getPassword())) {
            addCorsHeaders(request, response);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Invalid or missing X-App-Password\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private void addCorsHeaders(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");
        String allowedOrigins = appProperties.getCors().getAllowedOrigins();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());

        if (origin != null) {
            if (origins.contains("*") || origins.isEmpty()) {
                response.setHeader("Access-Control-Allow-Origin", "*");
            } else if (origins.stream().anyMatch(o -> o.equalsIgnoreCase(origin))) {
                response.setHeader("Access-Control-Allow-Origin", origin);
                response.setHeader("Vary", "Origin");
            }
        }

        response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type,X-App-Password");
    }
}
