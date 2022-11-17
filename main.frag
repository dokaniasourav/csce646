#version 300 es

#pragma vscode_glsllint_stage: frag

precision highp float;

uniform sampler2D u_image;
in vec2 v_texCord;
out vec4 outColor;

uniform float u_kernel[900];
uniform int u_kernel_size;
uniform int choice_algo;
uniform int intensity;

vec3 rgb2hsv(vec3 rgb_col)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(rgb_col.bg, K.wz), vec4(rgb_col.gb, K.xy), step(rgb_col.b, rgb_col.g));
    vec4 q = mix(vec4(p.xyw, rgb_col.r), vec4(rgb_col.r, p.yzx), step(p.x, rgb_col.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(
                abs(q.z + (q.w - q.y) / (6.0 * d + e)),         // Hue
                d / (q.x + e),                                  // Saturation
                q.x                                             // Value
    );
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float hueDistance(vec3 h1, vec3 h2) {
    vec3 diff_h = h1 - h2;
    float diff = (diff_h.r*diff_h.r + diff_h.g*diff_h.g + diff_h.b*diff_h.b)/3.0;
    return min(abs((1.0 - diff)), diff);
}

float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec3[2] closestColors(vec3 hsl_col) {
    vec3 close_cols[2];
    vec3 close_col1 = vec3(-2, 0, 0);
    vec3 close_col2 = vec3(-2, 0, 0);
    vec3 temp_col;

    const int SIDE = 2;
    const int NUM_P = SIDE*SIDE*SIDE;
    vec3[NUM_P] palette;
    for(int i=0; i<NUM_P; i++) {
        float rr = float(i%SIDE)/float(SIDE-1);
        float gg = float((i/SIDE)%SIDE)/float(SIDE-1);
        float bb = float((i/(SIDE*SIDE))%SIDE)/float(SIDE-1);
        //        palette[i] = rgb2hsv(vec3(random(seed.xy), random(seed.yz), random(seed.zw)));
        palette[i] = rgb2hsv(vec3(rr, gg, bb));
    }
//    vec3[NUM_P] palette = vec3[] (
//        vec3(1.0, 0.0, 0.0),
//        vec3(0.0, 1.0, 0.0),
//        vec3(1.0, 0.0, 1.0)
//    );
    int paletteSize = palette.length();

    for (int i = 0; i < paletteSize; ++i) {
        float tempDistance = hueDistance(palette[i], hsl_col);
        if (tempDistance < hueDistance(close_col1, hsl_col)) {
            close_col2 = close_col1;
            close_col1 = palette[i];
        } else {
            if (tempDistance < hueDistance(close_col2, hsl_col)) {
                close_col2 = palette[i];
            }
        }
    }
    close_cols[0] = close_col1;
    close_cols[1] = close_col2;
    return close_cols;
}

vec3 dither(vec3 col) {
    vec3 out_col;
    const int matrixWidth = 8;
    /**/
    const int[] indexMatrix =     int[] (0,  32, 8,  40, 2,  34, 10, 42,
                                        48, 16, 56, 24, 50, 18, 58, 26,
                                        12, 44, 4,  36, 14, 46, 6,  38,
                                        60, 28, 52, 20, 62, 30, 54, 22,
                                        3,  35, 11, 43, 1,  33, 9,  41,
                                        51, 19, 59, 27, 49, 17, 57, 25,
                                        15, 47, 7,  39, 13, 45, 5,  37,
                                        63, 31, 55, 23, 61, 29, 53, 21);
    /**/

    /**** Get the Index value ****/
    vec2 indexCord = vec2(textureSize(u_image, 0)) * v_texCord;
    int x = int(indexCord.x)%matrixWidth;
    int y = int(indexCord.y)%matrixWidth;
    int index = x + y*matrixWidth;
    /*****************************/

    float threshold = float(indexMatrix[index])/float(matrixWidth*matrixWidth);

    vec3 hsl_col = rgb2hsv(col);
    vec3 close_c[2] = closestColors(hsl_col);
    float diff = hueDistance(hsl_col, close_c[0]) / hueDistance(close_c[0], close_c[1]);
    out_col = (diff < threshold) ? hsv2rgb(close_c[0]) : hsv2rgb(close_c[1]);

//    out_col.r = col.r > threshold ? 1.0 : 0.0;
//    out_col.g = col.g > threshold ? 1.0 : 0.0;
//    out_col.b = col.b > threshold ? 1.0 : 0.0;

    return out_col;
}

vec3 convolution() {
    vec2 onePixel = vec2(intensity) / vec2(textureSize(u_image, 0));
    float kernelSum = 1.0;

    vec4 colorSum = vec4(0.0);      // Initially zero -- 0.0, 0.0, 0.0, 0.0
    for(int i=-(u_kernel_size - 1)/2; i<=(u_kernel_size - 1)/2; i++)
    {
        for(int j=-(u_kernel_size - 1)/2; j<=(u_kernel_size - 1)/2; j++)
        {
            int index = (i + (u_kernel_size - 1)/2 ) * u_kernel_size + (j + (u_kernel_size - 1)/2);
            colorSum += texture(u_image, v_texCord + onePixel * vec2(i,j)) * u_kernel[index];
        }
    }
    colorSum = vec4(colorSum.rgb/kernelSum, 1);
    return colorSum.rgb;
}

void main() {
    vec4 colorSum = vec4(0.0);      // Initially zero -- 0.0, 0.0, 0.0, 0.0

    if (choice_algo == 1) {
        colorSum = vec4(convolution(), 1);
    } else {
        vec4 color = texture(u_image, v_texCord);
        colorSum = vec4(dither(color.rgb), 1);
    }
    outColor = vec4(colorSum.rgb, 1);
}