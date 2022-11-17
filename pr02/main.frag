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

vec3 dither(vec3 col) {
    vec3 out_col;
    const int matrixWidth = 8;
    /**/
    const int[] indexMatrix =
    int[]  (0,  32, 8,  40, 2,  34, 10, 42,
            48, 16, 56, 24, 50, 18, 58, 26,
            12, 44, 4,  36, 14, 46, 6,  38,
            60, 28, 52, 20, 62, 30, 54, 22,
            3,  35, 11, 43, 1,  33, 9,  41,
            51, 19, 59, 27, 49, 17, 57, 25,
            15, 47, 7,  39, 13, 45, 5,  37,
            63, 31, 55, 23, 61, 29, 53, 21);

//    int[] (
//    43, 	44, 	45, 	46, 	47, 	48, 	49, 	50,
//    42, 	21, 	22, 	23, 	24, 	25, 	26, 	51,
//    41, 	20, 	7, 	    8, 	    9, 	    10, 	27, 	52,
//    40, 	19, 	6, 	    1, 	    2, 	    11, 	28, 	53,
//    39, 	18, 	5, 	    4, 	    3, 	    12, 	29, 	54,
//    38, 	17, 	16, 	15, 	14, 	13, 	30, 	55,
//    37, 	36, 	35, 	34, 	33, 	32, 	31, 	56,
//    64, 	63, 	62, 	61, 	60, 	59, 	58, 	57);

    /**/

    /**** Get the Index value ****/
    vec2 indexCord = vec2(textureSize(u_image, 0)) * v_texCord;
    int x = int(indexCord.x)%matrixWidth;
    int y = int(indexCord.y)%matrixWidth;
    int index = x + y*matrixWidth;
    /*****************************/

    float threshold = float(indexMatrix[index])/float(matrixWidth*matrixWidth);

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