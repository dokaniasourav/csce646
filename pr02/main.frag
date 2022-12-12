#version 300 es

#pragma vscode_glsllint_stage: frag

precision highp float;

uniform sampler2D u_image;
in vec2 v_texCord;
out vec4 outColor;

uniform float u_kernel[625];
uniform int u_kernel_size;
uniform int indexMatrix[256];
uniform int choice_algo;
uniform float intensity;

vec3 dither(vec3 col) {
    vec3 out_col;
    int matrixWidth = u_kernel_size;

    /**** Get the Index value ****/
    vec2 indexCord = vec2(textureSize(u_image, 0)) * v_texCord;
    int x = int(indexCord.x)%matrixWidth;
    int y = int(indexCord.y)%matrixWidth;
    int index = x + y*matrixWidth;
    /*****************************/

    float threshold = u_kernel[index]/float(matrixWidth*matrixWidth);

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
    } else if (choice_algo == 2){
        vec4 color = texture(u_image, v_texCord);
        colorSum = vec4(dither(color.rgb), 1);
    }
    outColor = vec4(colorSum.rgb, 1);
}