package core

import (
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	internalConfig "github.com/zenderock/simly-backend/internal/config"
)

type StorageService interface {
	UploadFile(ctx context.Context, file multipart.File, header *multipart.FileHeader, folder string) (string, error)
}

type R2StorageService struct {
	client     *s3.Client
	bucketName string
	publicURL  string
}

func NewR2StorageService(cfg *internalConfig.Config) (*R2StorageService, error) {
	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.R2AccountID),
		}, nil
	})

	awsCfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithEndpointResolverWithOptions(r2Resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.R2AccessKeyID, cfg.R2SecretAccessKey, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config, %v", err)
	}

	client := s3.NewFromConfig(awsCfg)

	return &R2StorageService{
		client:     client,
		bucketName: cfg.R2BucketName,
		publicURL:  cfg.R2PublicURL,
	}, nil
}

func (s *R2StorageService) UploadFile(ctx context.Context, file multipart.File, header *multipart.FileHeader, folder string) (string, error) {
	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s/%s%s", folder, uuid.New().String(), ext)

	// Upload to R2
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(filename),
		Body:        file,
		ContentType: aws.String(header.Header.Get("Content-Type")),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file to R2: %w", err)
	}

	// Construct public URL
	// If publicURL is set, use it. Otherwise, construct it using the R2 dev URL format (not recommended for prod without custom domain)
	// Ideally, user provides https://pub-xxx.r2.dev or a custom domain in R2PublicURL
	if s.publicURL != "" {
		return fmt.Sprintf("%s/%s", s.publicURL, filename), nil
	}

	// Fallback to a generic format if no public URL provided (might not work depending on R2 settings)
	return filename, nil
}
