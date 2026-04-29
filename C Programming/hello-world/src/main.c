#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[]) {

    printf("\nHello world!\n");
    printf("Welcome to C Programming\n");
    printf("-------------------------\n");

    if (argc == 1) {
        printf("\nNo command-line arguments were passed.\n");
    } else {
        printf("\n# of command-line arguments: %d\n", argc);
        printf("Command-line arguments:");
        for (int i = 1; i <= argc - 1; i++) {
            printf(" %s", argv[i]);
        }
        printf("\n");
    }

    return EXIT_SUCCESS;
}