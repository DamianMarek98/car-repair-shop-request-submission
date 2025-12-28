package car.repair.shop.auth;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private UserDetailsService userDetailsService;
    @Mock
    private JwtHelper jwtHelper;

    private JwtAuthFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthFilter(userDetailsService, jwtHelper);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilterInternal_shouldNotAuthenticate_givenMissingAuthorizationHeader() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, chain);

        verify(chain, times(1)).doFilter(request, response);
        verifyNoInteractions(jwtHelper, userDetailsService);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilterInternal_shouldNotAuthenticate_givenNonBearerAuthorizationheader() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic abc123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, chain);

        verify(chain).doFilter(request, response);
        verifyNoInteractions(jwtHelper, userDetailsService);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilterInternal_shouldAuthenticate_givenValidToken() throws Exception {
        String token = "valid.jwt.token";
        String username = "john";
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        UserDetails userDetails = User.withUsername(username).password("password").roles("USER").build();

        when(jwtHelper.extractUsername(token)).thenReturn(username);
        when(userDetailsService.loadUserByUsername(username)).thenReturn(userDetails);
        when(jwtHelper.validateToken(token, userDetails)).thenReturn(true);

        filter.doFilterInternal(request, response, chain);

        verify(jwtHelper).extractUsername(token);
        verify(userDetailsService).loadUserByUsername(username);
        verify(jwtHelper).validateToken(token, userDetails);
        verify(chain).doFilter(request, response);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(userDetails);
    }

    @Test
    void doFilterInternal_shouldReturnUnauthorized_givenAccessDeniedExceptionDuringUsernameExtraction() throws Exception {
        String token = "invalid.jwt.token";
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        when(jwtHelper.extractUsername(token)).thenThrow(new org.springframework.security.access.AccessDeniedException("bad token"));

        filter.doFilterInternal(request, response, chain);

        verify(chain, never()).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).isEqualTo("{\"message\":\"Unauthorized\"}");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilterInternal_shouldReturnUnauthorized_givenUnauthorizedExceptionDuringUsernameExtraction() throws Exception {
        String token = "unauth.jwt.token";
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        when(jwtHelper.extractUsername(token)).thenThrow(new UnauthorizedException());

        filter.doFilterInternal(request, response, chain);

        verify(chain, never()).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).isEqualTo("{\"message\":\"Unauthorized\"}");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilterInternal_shouldSkipUserLoading_givenExistingAuthentication() throws Exception {
        String token = "any.jwt.token";
        String username = "existing";
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(username, null));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        when(jwtHelper.extractUsername(token)).thenReturn(username);

        filter.doFilterInternal(request, response, chain);

        verify(userDetailsService, never()).loadUserByUsername(any());
        verify(jwtHelper, never()).validateToken(eq(token), any());
        verify(chain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(username);
    }

    @Test
    void doFilterInternal_shouldNotAuthenticate_givenTokenValidationFails() throws Exception {
        String token = "some.jwt.token";
        String username = "user1";
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        UserDetails userDetails = User.withUsername(username).password("pw").roles("USER").build();

        when(jwtHelper.extractUsername(token)).thenReturn(username);
        when(userDetailsService.loadUserByUsername(username)).thenReturn(userDetails);
        when(jwtHelper.validateToken(token, userDetails)).thenReturn(false);

        filter.doFilterInternal(request, response, chain);

        verify(jwtHelper).extractUsername(token);
        verify(userDetailsService).loadUserByUsername(username);
        verify(jwtHelper).validateToken(token, userDetails);
        verify(chain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilterInternal_shouldDoNothing_givenNullUsername() throws Exception {
        String token = "token.with.null.username";
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        when(jwtHelper.extractUsername(token)).thenReturn(null);

        filter.doFilterInternal(request, response, chain);

        verify(jwtHelper).extractUsername(token);
        verifyNoInteractions(userDetailsService);
        verify(chain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void shouldNotFilter_shouldReturnTrue_givenWhitelistedPaths() {
        assertWhitelistedPath("/api/internal/login");
        assertWhitelistedPath("/api/repair-request/submit");
        assertWhitelistedPath("/api/internal/unavailable-day/all");
    }

    @Test
    void shouldNotFilter_shouldReturnFalse_givenNonWhitelistedPath() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/other");
        assertThat(filter.shouldNotFilter(request)).isFalse();
    }

    private void assertWhitelistedPath(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI(path);
        assertThat(filter.shouldNotFilter(request)).isTrue();
    }
}
