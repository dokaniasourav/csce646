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

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float hueDistance(float h1, float h2) {
    float diff = abs((h1 - h2));
    return min(abs((1.0 - diff)), diff);
}

vec3[2] closestColors(float hue) {
    vec3 ret[2];
    vec3 closest = vec3(-2, 0, 0);
    vec3 secondClosest = vec3(-2, 0, 0);
    vec3 temp;
    vec3[2] palette = vec3[] (
        vec3(0.0, 0.0, 0.0),
        vec3(0.1, 0.1, 0.1)
    );

    int paletteSize = palette.length();

    for (int i = 0; i < paletteSize; ++i) {
        temp = palette[i];
        float tempDistance = hueDistance(temp.x, hue);
        if (tempDistance < hueDistance(closest.x, hue)) {
            secondClosest = closest;
            closest = temp;
        } else {
            if (tempDistance < hueDistance(secondClosest.x, hue)) {
                secondClosest = temp;
            }
        }
    }
    ret[0] = closest;
    ret[1] = secondClosest;
    return ret;
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

    vec2 indexCord = vec2(textureSize(u_image, 0)) * v_texCord;
    int x = int(indexCord.x)%matrixWidth;
    int y = int(indexCord.y)%matrixWidth;
    int index = x + y*matrixWidth;

    float threshold = float(indexMatrix[index])/float(matrixWidth*matrixWidth);
    // float threshold = u_kernel[index];

    // out_col.r = round(col.r*float(intensity))/float(intensity);
    // out_col.g = round(col.g*float(intensity))/float(intensity);
    // out_col.b = round(col.b*float(intensity))/float(intensity);

    out_col.r = col.r > threshold ? 1.0 : 0.0;
    out_col.g = col.g > threshold ? 1.0 : 0.0;
    out_col.b = col.b > threshold ? 1.0 : 0.0;

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