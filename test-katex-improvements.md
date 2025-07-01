# Test KaTeX Improvements

Đây là file test để kiểm tra các cải thiện KaTeX dựa trên nội dung mẫu từ user.

## Nội dung test gốc (từ user)

Inline math: $E = mc^2$ and $\sum_{i=1}^{n} x_i$. Also, consider $a \equiv b \pmod{m}$, which denotes congruence modulo $m$. We can also represent the derivative as $\frac{dy}{dx}$ or the gradient as $\nabla f$.

Block math:
$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

$$\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}$$

More complex examples include:

Inline: The quadratic formula is given by $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$. The binomial coefficient is denoted as ${n \choose k}$.

Block:
$$
\lim_{x \to 0} \frac{\sin(x)}{x} = 1
$$

$$
\Gamma(z) = \int_0^\infty x^{z-1} e^{-x} dx
$$

The Fourier transform is defined as:

$$
F(\omega) = \int_{-\infty}^{\infty} f(t) e^{-j\omega t} dt
$$

The Navier-Stokes equations:

$$
\rho \left( \frac{\partial \mathbf{v}}{\partial t} + \mathbf{v} \cdot \nabla \mathbf{v} \right) = -\nabla p + \mu \nabla^2 \mathbf{v} + \mathbf{f}
$$

Einstein's field equations:

$$
R_{\mu\nu} - \frac{1}{2}Rg_{\mu\nu} + \Lambda g_{\mu\nu} = \frac{8\pi G}{c^4} T_{\mu\nu}
$$

The Cauchy-Schwarz inequality:

$$
\left( \sum_{i=1}^{n} u_i v_i \right)^2 \leq \left( \sum_{i=1}^{n} u_i^2 \right) \left( \sum_{i=1}^{n} v_i^2 \right)
$$

The cross product of two vectors $\mathbf{a}$ and $\mathbf{b}$ is given by:

$$
\mathbf{a} \times \mathbf{b} = \begin{vmatrix}
\mathbf{i} & \mathbf{j} & \mathbf{k} \\
a_1 & a_2 & a_3 \\
b_1 & b_2 & b_3
\end{vmatrix}
$$

## Các cải thiện đã thực hiện

### 1. Cải thiện PromptBuilder.ts
- Mở rộng quy tắc KaTeX từ 14 quy tắc lên 44 quy tắc chi tiết
- Thêm hướng dẫn cho các ký hiệu Greek letters đầy đủ
- Thêm quy tắc cho matrices, determinants, integrals, summations
- Thêm hướng dẫn cho derivatives, gradients, limits
- Thêm quy tắc cho binomial coefficients, modular arithmetic
- Thêm hướng dẫn cho vectors, cross products
- Thêm quy tắc spacing chi tiết

### 2. Cải thiện ContentProcessor.ts
- Nâng cấp phương thức `fixKaTeXFormatting` với 15+ quy tắc mới
- Xử lý matrix formatting với proper line breaks
- Fix fraction, integral, summation formatting
- Fix limit expressions và modular arithmetic
- Fix vector notation và Greek letters spacing
- Fix bracket sizing và operator spacing
- Preserve line breaks cho complex expressions

### 3. Các trường hợp test cần kiểm tra

#### Test Case 1: Inline Math
- $E = mc^2$ (Einstein's mass-energy equivalence)
- $\sum_{i=1}^{n} x_i$ (Summation notation)
- $a \equiv b \pmod{m}$ (Modular arithmetic)
- $\frac{dy}{dx}$ (Derivatives)
- $\nabla f$ (Gradient)
- ${n \choose k}$ (Binomial coefficient)

#### Test Case 2: Display Math
- Integrals với limits: $\int_{-\infty}^{\infty} e^{-x^2} dx$
- Matrices: $\begin{pmatrix} a & b \\\\ c & d \end{pmatrix}$
- Limits: $\lim_{x \to 0} \frac{\sin(x)}{x} = 1$
- Special functions: $\Gamma(z) = \int_0^\infty x^{z-1} e^{-x} dx$

#### Test Case 3: Complex Equations
- Fourier transform
- Navier-Stokes equations
- Einstein field equations
- Cauchy-Schwarz inequality
- Vector cross product với determinant

### 4. Kết quả mong đợi
- Tất cả KaTeX expressions được render chính xác
- Proper spacing around mathematical expressions
- Correct matrix và determinant formatting
- Proper Greek letters và special symbols
- Correct subscripts và superscripts
- Proper fraction và integral formatting

## Hướng dẫn test

1. Sử dụng AI toolbar để reformat nội dung này
2. Kiểm tra xem các công thức toán học có được format đúng không
3. Verify rằng tất cả KaTeX syntax được preserve
4. Đảm bảo không có lỗi formatting trong complex expressions
5. Kiểm tra spacing around mathematical expressions

Các cải thiện này sẽ giúp AI tạo ra output KaTeX chuẩn hơn và xử lý được các trường hợp phức tạp như trong ví dụ của user.